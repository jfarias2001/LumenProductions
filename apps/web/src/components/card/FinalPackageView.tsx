import { useState } from 'react';
import { useDeliverable } from '../../hooks/useDeliverable.js';

interface Props {
  cardId: string;
}

export default function FinalPackageView({ cardId }: Props) {
  const { data, isLoading } = useDeliverable(cardId);
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) return <p className="text-sm text-slate-500">Carregando pacote…</p>;

  async function copyMarkdown() {
    const token = localStorage.getItem('access_token') ?? '';
    const res = await fetch(`/api/v1/cards/${cardId}/deliverable?format=md`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    const md = await res.text();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="badge bg-ai-600/15 text-ai-400 border border-ai-500/40">
          {data.type === 'VIDEO' ? '🎬 Vídeo (Reel)' : '🖼 Estático (post/carrossel)'}
        </span>
        <button onClick={() => void copyMarkdown()} className="btn-ghost text-xs">{copied ? 'Copiado ✓' : '⧉ Copiar (Markdown)'}</button>
      </div>

      {data.type === 'VIDEO' ? (
        <>
          {data.hook && <Section title="Hook"><p className="text-slate-200">{data.hook}</p></Section>}
          {data.script ? (
            <Section title="Roteiro">
              <div className="space-y-2">
                {(['dor', 'quebra', 'mecanismo', 'beneficio', 'cta'] as const).map((k) => (
                  <div key={k}>
                    <p className="text-[11px] font-semibold text-brand-300/80 uppercase">{k}</p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{String(data.script?.[k] ?? '—')}</p>
                  </div>
                ))}
                <p className="text-xs text-slate-500">Duração: {String(data.script['durationSec'] ?? '—')}s</p>
              </div>
            </Section>
          ) : <Missing label="Roteiro" />}
          {data.screenTexts.length > 0 && (
            <Section title="Textos de tela">
              <div className="flex flex-wrap gap-1.5">{data.screenTexts.map((t, i) => <span key={i} className="badge bg-surface-700 text-slate-300">{t}</span>)}</div>
            </Section>
          )}
          {data.editingInsights.length > 0 ? (
            <Section title="Insights de edição">
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">{data.editingInsights.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </Section>
          ) : <Missing label="Insights de edição" />}
        </>
      ) : (
        <>
          {data.format && <Section title="Formato"><span className="badge bg-brand-600/20 text-brand-300">{data.format.replace(/_/g, ' ')}</span></Section>}
          {data.graphicElements.length > 0 ? (
            <Section title="Elementos gráficos">
              <div className="space-y-2">
                {data.graphicElements.map((g, i) => (
                  <div key={i} className="surface-card bg-surface-850 p-3">
                    <p className="text-[11px] font-semibold text-brand-300/80 uppercase mb-1">Slide {g.slide ?? i + 1}</p>
                    {g.headline && <p className="text-sm text-slate-100 font-medium">{g.headline}</p>}
                    {g.body && <p className="text-sm text-slate-300 whitespace-pre-wrap">{g.body}</p>}
                    {g.visual && <p className="text-xs text-slate-500 mt-1">Visual: {g.visual}</p>}
                  </div>
                ))}
              </div>
            </Section>
          ) : <Missing label="Elementos gráficos" />}
          {data.palette && <Section title="Paleta"><p className="text-sm text-slate-300 whitespace-pre-wrap">{data.palette}</p></Section>}
        </>
      )}

      {data.caption ? <Section title="Legenda"><p className="text-sm text-slate-200 whitespace-pre-wrap">{data.caption}</p></Section> : <Missing label="Legenda" />}
      {data.ctaVariations.length > 0 && (
        <Section title="CTAs">
          <ul className="space-y-1">{data.ctaVariations.map((c, i) => <li key={i} className="text-sm text-slate-300 surface-card bg-surface-850 px-3 py-1.5">{c}</li>)}</ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card bg-surface-850 p-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return <p className="text-xs text-slate-600">{label}: ainda não consolidado.</p>;
}
