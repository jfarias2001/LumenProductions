import { useState } from 'react';
import { useQuickCopy, useCreateV2Card } from '../hooks/useV2.js';
import AppHeader from '../components/AppHeader.js';
import PromptPicker, { type PromptChoice } from '../components/v2/PromptPicker.js';

function aiOff(err: unknown): boolean {
  const m = (err as Error)?.message ?? '';
  return /not_configured|indisponível|openai|não configurada/i.test(m);
}

/** Aba Teste (PRD-017) — copy rápida a partir de um prompt livre. */
export default function QuickCopyPage() {
  const [prompt, setPrompt] = useState('');
  const [choice, setChoice] = useState<PromptChoice>({});
  const [copied, setCopied] = useState(false);
  const gen = useQuickCopy();
  const createCard = useCreateV2Card();
  const result = gen.data;

  function generate() {
    if (prompt.trim().length < 3) return;
    setCopied(false);
    gen.mutate({ prompt: prompt.trim(), ...choice });
  }

  function copyToClipboard() {
    if (!result) return;
    const text = [result.copy, '', ...(result.ctas ?? [])].join('\n');
    void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function saveAsCard() {
    if (!result) return;
    createCard.mutate({
      idea: prompt.trim(),
      title: prompt.trim().slice(0, 120),
      focus: '',
      copy: result.copy,
      ctas: result.ctas ?? [],
      customPromptId: choice.customPromptId,
    });
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white font-display">Copy Rápida</h2>
            <p className="text-xs text-slate-500">Gere copy na hora a partir de um prompt. Segue a Regra de Ouro; some um prompt personalizado se quiser.</p>
          </div>

          <PromptPicker value={choice} onChange={setChoice} />

          <div>
            <label className="label-base">O que você quer gerar?</label>
            <textarea
              className="input-base h-28 resize-none"
              placeholder="Ex.: uma legenda para um Reel sobre como a IA de atendimento fecha lead às 22h…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <button onClick={generate} disabled={gen.isPending || prompt.trim().length < 3} className="btn-ai disabled:opacity-40">
            {gen.isPending ? 'Gerando…' : '✦ Gerar copy'}
          </button>

          {aiOff(gen.error) && <p className="text-xs text-amber-300/90">IA indisponível — configure a OPENAI_API_KEY no backend.</p>}
          {gen.isError && !aiOff(gen.error) && <p className="text-xs text-rose-400">{(gen.error as Error)?.message || 'Falha ao gerar.'}</p>}

          {result && (
            <div className="surface-card bg-surface-850 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-300">✓ Copy gerada</p>
                <div className="flex gap-2">
                  <button onClick={copyToClipboard} className="btn-ghost text-xs">{copied ? '✓ Copiado' : 'Copiar'}</button>
                  <button onClick={saveAsCard} disabled={createCard.isPending} className="btn-ghost text-xs">
                    {createCard.isPending ? 'Salvando…' : createCard.isSuccess ? '✓ Salvo no V2' : 'Salvar como card V2'}
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{result.copy}</p>
              {(result.ctas ?? []).length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 uppercase mb-1">CTAs</p>
                  <ul className="space-y-1">
                    {result.ctas.map((c, i) => <li key={i} className="text-sm text-slate-300 surface-card bg-surface-900 px-3 py-1.5">{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
