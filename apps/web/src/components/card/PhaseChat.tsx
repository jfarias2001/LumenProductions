import { useEffect, useMemo, useRef, useState } from 'react';
import { CONVERSATIONAL_STAGES, STAGE_LABELS, isConversationalStage, type Stage } from '@content-engine/shared';
import { useConversation, useSendMessage, useConsolidate } from '../../hooks/useConversation.js';
import { usePromptTemplates } from '../../hooks/usePromptTemplates.js';

interface Props {
  cardId: string;
  currentStage: Stage;
}

export default function PhaseChat({ cardId, currentStage }: Props) {
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
        <p className="text-[11px] text-emerald-300/80 pb-2">Consolidado nos campos do card ✓</p>
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
