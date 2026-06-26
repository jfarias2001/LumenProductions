import { useEffect, useState } from 'react';
import { Stage } from '@content-engine/shared';
import { useGenerate } from '../../hooks/useConversation.js';
import { PILLAR_LABELS, AWARENESS_LABELS } from '../../lib/labels.js';

interface Props {
  cardId: string;
  stage: Stage;
}

interface GenerateResult {
  entity: string;
  data: Record<string, unknown>;
}

/** Resumo legível (label → valor) do que a geração gravou, por tipo de entidade. */
function summaryLines(result: GenerateResult | undefined): { label: string; value: string }[] {
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

/**
 * Geração por fase com IA (sem chat conversacional). A IA grava o resultado
 * diretamente nos campos do card; o avanço fica a cargo da AdvanceBar.
 */
export default function StageGenerator({ cardId, stage }: Props) {
  const generate = useGenerate(cardId, stage);
  const [context, setContext] = useState('');

  // Em Ideias Brutas o contexto é obrigatório (não há card preenchido para inferir).
  const contextRequired = stage === Stage.IDEIAS_BRUTAS;
  const canGenerate = !generate.isPending && (!contextRequired || context.trim().length > 0);

  // Ao trocar de fase, limpa o contexto.
  useEffect(() => { setContext(''); }, [stage]);

  const result = generate.data as GenerateResult | undefined;
  const summary = summaryLines(result);
  const errMsg = (generate.error as Error)?.message ?? '';
  const aiOff = /not_configured|indisponível|openai/i.test(errMsg);

  async function handleGenerate() {
    if (!canGenerate) return;
    try {
      await generate.mutateAsync(context.trim() || undefined);
    } catch {
      // erro exibido inline; mantém o contexto para o usuário retentar
    }
  }

  return (
    <div className="surface-card bg-surface-850 border-ai-500/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-ai-300">
          ✦ Gerar com IA {contextRequired && <span className="text-amber-300/80">(informação obrigatória)</span>}
        </p>
      </div>
      <textarea
        className="input-base resize-none h-[72px] text-sm"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder={
          contextRequired
            ? 'Baseado em qual informação? Ex.: tema, transcrição, dado de mercado, dor observada…'
            : 'Informação de partida (opcional) — a IA também usa o que já existe no card.'
        }
      />
      <div className="flex items-center gap-2">
        <button onClick={() => void handleGenerate()} disabled={!canGenerate} className="btn-ai text-xs">
          {generate.isPending ? <><span className="h-3 w-3 rounded-full border-2 border-ai-400/40 border-t-ai-400 animate-spin" /> Gerando…</> : '✦ Gerar com IA'}
        </button>
        <span className="text-[11px] text-slate-500">A IA grava o resultado nos campos do card.</span>
      </div>

      {aiOff && <p className="text-[11px] text-amber-300/80">IA indisponível — configure a OPENAI_API_KEY no backend ou preencha manualmente.</p>}
      {generate.isError && !aiOff && <p className="text-[11px] text-amber-300/80">{errMsg || 'Falha ao gerar.'}</p>}

      {generate.isSuccess && (
        <div className="surface-card bg-surface-900 border-emerald-500/30 p-3 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-emerald-300">✓ Gerado e gravado nos campos do card</p>
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
        </div>
      )}
    </div>
  );
}
