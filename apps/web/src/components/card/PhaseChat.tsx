import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATIONAL_STAGES, STAGE_LABELS, STAGE_ORDER, Stage, isConversationalStage } from '@content-engine/shared';
import { useConversation, useSendMessage, useConsolidate } from '../../hooks/useConversation.js';
import { useTransitionCard } from '../../hooks/useBoard.js';
import { usePromptTemplates } from '../../hooks/usePromptTemplates.js';
import { PILLAR_LABELS, AWARENESS_LABELS } from '../../lib/labels.js';

interface Props {
  cardId: string;
  currentStage: Stage;
}

interface ConsolidateResult {
  entity: string;
  data: Record<string, unknown>;
}

/** Resumo legível (label → valor) do que a consolidação gravou, por tipo de entidade. */
function summaryLines(result: ConsolidateResult | undefined): { label: string; value: string }[] {
  if (!result) return [];
  const d = result.data;
  const lines: { label: string; value: string | null | undefined }[] = [];
  switch (result.entity) {
    case 'card':
      lines.push(
        { label: 'Título', value: d.title as string },
        { label: 'Persona', value: d.persona as string },
        { label: 'Dor', value: d.pain as string },
        { label: 'Promessa', value: d.promise as string },
        { label: 'Pilar', value: d.pillar ? (PILLAR_LABELS[d.pillar as string] ?? String(d.pillar)) : null },
        { label: 'Consciência', value: d.awareness ? (AWARENESS_LABELS[d.awareness as string] ?? String(d.awareness)) : null },
      );
      break;
    case 'validation':
      lines.push(
        { label: 'Nota', value: `${String(d.total)}/18` },
        { label: 'Veredito', value: String(d.verdict).replace(/_/g, ' ') },
      );
      break;
    case 'angles':
      lines.push(
        { label: 'Ângulos gerados', value: String((d.angles as unknown[])?.length ?? 0) },
        { label: 'Hooks gerados', value: String((d.hooks as unknown[])?.length ?? 0) },
      );
      break;
    case 'copy':
      lines.push(
        { label: 'Roteiro', value: d.script ? 'gerado' : null },
        { label: 'Legenda', value: (d.copy as Record<string, unknown>)?.caption ? 'gerada' : null },
      );
      break;
    case 'creative':
      lines.push({ label: 'Formato', value: d.format ? String(d.format).replace(/_/g, ' ') : null });
      break;
    case 'derivedAssets':
      lines.push({ label: 'Ativos derivados', value: String(Array.isArray(d) ? d.length : 0) });
      break;
  }
  return lines.filter((l): l is { label: string; value: string } => Boolean(l.value));
}

export default function PhaseChat({ cardId, currentStage }: Props) {
  const qc = useQueryClient();
  const transition = useTransitionCard();
  const initial = isConversationalStage(currentStage) ? currentStage : CONVERSATIONAL_STAGES[0]!;
  const [stage, setStage] = useState<Stage>(initial);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useConversation(cardId, stage);
  const { send, streaming, pending, error } = useSendMessage(cardId, stage);
  const consolidate = useConsolidate(cardId, stage);
  const { data: prompts = [] } = usePromptTemplates(stage);

  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streaming]);

  async function handleSend(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setInput('');
    await send(content);
  }

  const aiOff = error === 'AI_NOT_CONFIGURED';

  // Próxima fase do card (só oferecemos avançar quando estamos consolidando a fase real do card).
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1]! : null;
  const canAdvance = stage === currentStage && nextStage !== null && nextStage !== Stage.ARQUIVADO;
  const summary = summaryLines(consolidate.data as ConsolidateResult | undefined);

  function handleAdvance() {
    if (!nextStage) return;
    transition.mutate(
      { cardId, to: nextStage },
      { onSuccess: () => { void qc.invalidateQueries({ queryKey: ['card', cardId] }); } },
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Seletor de fase */}
      <div className="flex items-center gap-2 pb-3 shrink-0">
        <label className="text-xs text-slate-500">Fase:</label>
        <select className="input-base !w-auto !py-1.5" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
          {CONVERSATIONAL_STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={() => consolidate.mutate()}
          disabled={consolidate.isPending || !messages.length}
          className="btn-ai ml-auto !py-1.5 text-xs"
          title="Transformar a conversa nos campos do card"
        >
          {consolidate.isPending ? 'Consolidando…' : '✓ Consolidar nesta fase'}
        </button>
      </div>

      {consolidate.isError && (
        <p className="text-[11px] text-amber-300/80 pb-2">{(consolidate.error as Error)?.message ?? 'Falha ao consolidar.'}</p>
      )}
      {consolidate.isSuccess && (
        <div className="mb-3 shrink-0 surface-card bg-surface-850 border-emerald-500/30 p-3 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-emerald-300">✓ Consolidado nos campos do card</p>
          {summary.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {summary.map((l) => (
                <div key={l.label} className="contents">
                  <dt className="text-slate-500">{l.label}</dt>
                  <dd className="text-slate-200 truncate" title={l.value}>{l.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {canAdvance && nextStage && (
            <div className="pt-1">
              <button
                onClick={handleAdvance}
                disabled={transition.isPending}
                className="btn-primary text-xs w-full"
                title={`Mover o card para a fase ${STAGE_LABELS[nextStage]}`}
              >
                {transition.isPending ? 'Avançando…' : `Avançar → ${STAGE_LABELS[nextStage]}`}
              </button>
              {transition.isError && (
                <p className="text-[11px] text-amber-300/80 mt-1.5">
                  {(transition.error as Error)?.message ?? 'Não foi possível avançar (gate de qualidade).'}
                </p>
              )}
              {transition.isSuccess && (
                <p className="text-[11px] text-emerald-300/80 mt-1.5">Card movido para {STAGE_LABELS[nextStage]} ✓</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando conversa…</p>
        ) : !messages.length && !streaming ? (
          <div className="text-center text-slate-500 text-sm py-8">
            <p className="mb-1">Converse com a IA para construir esta fase.</p>
            <p className="text-xs text-slate-600">Use uma sugestão abaixo ou escreva sua própria mensagem.</p>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)
        )}
        {streaming && <Bubble role="assistant" content={streaming} />}
        {pending && !streaming && <Bubble role="assistant" content="…" />}
      </div>

      {/* Chips de prompts padrão */}
      {prompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 shrink-0">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => setInput(p.body)}
              title={p.body}
              className={`badge cursor-pointer hover:border-brand-500/60 border ${p.isDefault ? 'bg-brand-600/15 text-brand-300 border-brand-500/40' : 'bg-surface-700 text-slate-300 border-transparent'}`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-3 shrink-0">
        {aiOff && <p className="text-[11px] text-amber-300/80 mb-2">IA indisponível — configure a OPENAI_API_KEY no backend.</p>}
        {error && !aiOff && <p className="text-[11px] text-rose-300/80 mb-2">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            className="input-base resize-none h-[58px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(input);
              }
            }}
            placeholder="Escreva para a IA… (Enter envia, Shift+Enter quebra linha)"
          />
          <button onClick={() => void handleSend(input)} disabled={pending || !input.trim()} className="btn-primary shrink-0 h-[58px]">
            {pending ? '…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser ? 'bg-brand-600/20 text-brand-50 border border-brand-500/30' : 'bg-surface-850 text-slate-200 border border-surface-700'
        }`}
      >
        {!isUser && <span className="text-[10px] text-ai-400 font-medium block mb-1">✦ Copiloto IA</span>}
        {content}
      </div>
    </div>
  );
}
