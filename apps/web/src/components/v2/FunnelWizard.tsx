import { useState } from 'react';
import { useV2Ideas, useV2Titles, useV2Focus, useV2Copy, useCreateV2Card } from '../../hooks/useV2.js';
import PromptPicker, { type PromptChoice } from './PromptPicker.js';

const STEPS = ['Ideias', 'Título', 'Foco', 'Copy'] as const;

function aiOff(err: unknown): boolean {
  const m = (err as Error)?.message ?? '';
  return /not_configured|indisponível|openai|não configurada/i.test(m);
}

/** Funil de criação com IA (PRD-017): Ideias → Título → Foco → Copy → cria card V2. */
export default function FunnelWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<PromptChoice>({});
  const [context, setContext] = useState('');
  const [idea, setIdea] = useState('');
  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [copy, setCopy] = useState('');
  const [ctas, setCtas] = useState<string[]>([]);

  const ideasM = useV2Ideas();
  const titlesM = useV2Titles();
  const focusM = useV2Focus();
  const copyM = useV2Copy();
  const createM = useCreateV2Card();

  const busy = ideasM.isPending || titlesM.isPending || focusM.isPending || copyM.isPending;
  const err = (ideasM.error || titlesM.error || focusM.error || copyM.error) as Error | null;

  function genIdeas() { ideasM.mutate({ context: context.trim() || undefined, ...choice }); }
  function genTitles() { titlesM.mutate({ idea, ...choice }); }
  function genFocus() { focusM.mutate({ idea, title, ...choice }); }
  function genCopy() {
    copyM.mutate({ idea, title, focus, ...choice }, {
      onSuccess: (d) => { setCopy(d.copy); setCtas(d.ctas ?? []); },
    });
  }

  function createCard() {
    createM.mutate(
      { idea, title, focus, copy, ctas, customPromptId: choice.customPromptId },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="glass-overlay" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-card animate-fade-up overflow-hidden">
        {/* Header + stepper */}
        <div className="px-5 py-4 border-b border-surface-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white font-display">✦ Criar com IA</h2>
            <button onClick={onClose} className="btn-ghost text-lg leading-none px-2 py-1">×</button>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 shrink-0 ${
                  i < step ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                  : i === step ? 'bg-brand-500 border-brand-400 text-white'
                  : 'bg-surface-850 border-surface-700 text-slate-600'
                }`}>{i < step ? '✓' : i + 1}</span>
                <span className={`text-[11px] ${i === step ? 'text-brand-300 font-medium' : 'text-slate-500'}`}>{s}</span>
                {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-500/40' : 'bg-surface-700'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <PromptPicker value={choice} onChange={setChoice} />

          {aiOff(err) && <p className="text-xs text-amber-300/90">IA indisponível — configure a OPENAI_API_KEY no backend.</p>}
          {err && !aiOff(err) && <p className="text-xs text-rose-400">{err.message || 'Falha ao gerar.'}</p>}

          {/* Passo 1 — Ideias */}
          {step === 0 && (
            <div className="space-y-3">
              <label className="label-base">Tema/contexto (opcional)</label>
              <textarea
                className="input-base h-16 resize-none"
                placeholder="Ex.: onboarding, prova de resultado, objeção de preço… (deixe vazio p/ a IA propor)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
              <button onClick={genIdeas} disabled={busy} className="btn-ai text-xs">
                {ideasM.isPending ? 'Gerando ideias…' : ideasM.data ? '↻ Gerar outras' : '✦ Sugerir ideias'}
              </button>
              <div className="space-y-1.5">
                {ideasM.data?.ideas.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => setIdea(it.idea)}
                    className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${idea === it.idea ? 'bg-brand-600/10 border-brand-500/50' : 'bg-surface-850 border-surface-700 hover:border-surface-600'}`}
                  >
                    <span className="text-slate-200">{it.idea}</span>
                    {it.note && <span className="block text-[11px] text-slate-500 mt-0.5">{it.note}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Passo 2 — Título */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">Ideia: <span className="text-slate-300">{idea}</span></p>
              <button onClick={genTitles} disabled={busy} className="btn-ai text-xs">
                {titlesM.isPending ? 'Gerando títulos…' : titlesM.data ? '↻ Gerar outros' : '✦ Sugerir títulos'}
              </button>
              <div className="space-y-1.5">
                {titlesM.data?.titles.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setTitle(t)}
                    className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${title === t ? 'bg-brand-600/10 border-brand-500/50' : 'bg-surface-850 border-surface-700 hover:border-surface-600'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* Passo 3 — Foco */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">Título: <span className="text-slate-300">{title}</span></p>
              <button onClick={genFocus} disabled={busy} className="btn-ai text-xs">
                {focusM.isPending ? 'Gerando focos…' : focusM.data ? '↻ Gerar outros' : '✦ Sugerir foco'}
              </button>
              <div className="space-y-1.5">
                {focusM.data?.focuses.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setFocus(f.focus)}
                    className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${focus === f.focus ? 'bg-brand-600/10 border-brand-500/50' : 'bg-surface-850 border-surface-700 hover:border-surface-600'}`}
                  >
                    <span className="text-slate-100 font-medium">{f.focus}</span>
                    {f.description && <span className="block text-[11px] text-slate-500 mt-0.5">{f.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Passo 4 — Copy */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">Foco: <span className="text-slate-300">{focus}</span></p>
              <button onClick={genCopy} disabled={busy} className="btn-ai text-xs">
                {copyM.isPending ? 'Escrevendo copy…' : copy ? '↻ Gerar outra' : '✦ Produzir copy'}
              </button>
              {copy && (
                <>
                  <label className="label-base">Copy (editável)</label>
                  <textarea className="input-base h-40 resize-none text-sm" value={copy} onChange={(e) => setCopy(e.target.value)} />
                  <label className="label-base">CTAs (uma por linha)</label>
                  <textarea
                    className="input-base h-20 resize-none text-sm"
                    value={ctas.join('\n')}
                    onChange={(e) => setCtas(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Rodapé de navegação */}
        <div className="px-5 py-3 border-t border-surface-700 flex items-center justify-between shrink-0 bg-surface-900/95">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost text-xs disabled:opacity-40"
          >← Voltar</button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 0 && !idea) || (step === 1 && !title) || (step === 2 && !focus)}
              className="btn-primary text-xs disabled:opacity-40"
            >Próximo →</button>
          ) : (
            <button onClick={createCard} disabled={!copy || createM.isPending} className="btn-primary text-xs disabled:opacity-40">
              {createM.isPending ? 'Criando…' : '✓ Criar card'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
