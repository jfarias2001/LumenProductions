import { useState } from 'react';
import { useCustomPrompts } from '../../hooks/usePrompts.js';

export interface PromptChoice {
  customPromptId?: string;
  customPromptText?: string;
}

/**
 * Seletor de prompt personalizado (PRD-017). A Regra de Ouro entra SEMPRE; aqui o
 * usuário opcionalmente SOMA um prompt salvo e/ou instruções digitadas na hora.
 * Controlado: `value`/`onChange` devolvem `{ customPromptId?, customPromptText? }`.
 */
export default function PromptPicker({ value, onChange }: { value: PromptChoice; onChange: (v: PromptChoice) => void }) {
  const { data: prompts = [] } = useCustomPrompts();
  const active = Boolean(value.customPromptId || value.customPromptText);
  const [open, setOpen] = useState(active);

  return (
    <div className="surface-card bg-surface-850 border-white/[0.06] p-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-xs font-medium text-slate-300">
          <span className="text-ai-300">✦</span> Prompt de Ouro <span className="text-slate-500">(sempre ativo)</span>
          {active && <span className="ml-2 badge bg-ai-600/15 text-ai-300 border border-ai-500/30">+ personalizado</span>}
        </span>
        <span className="text-slate-500 text-xs">{open ? '▾' : '▸ personalizar'}</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[11px] text-slate-500">Some instruções extras à Regra de Ouro (opcional):</p>
          {prompts.length > 0 && (
            <select
              className="input-base text-xs"
              value={value.customPromptId ?? ''}
              onChange={(e) => onChange({ ...value, customPromptId: e.target.value || undefined })}
            >
              <option value="">— Nenhum prompt salvo —</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <textarea
            className="input-base text-xs h-20 resize-none"
            placeholder="Ou digite instruções personalizadas para esta geração…"
            value={value.customPromptText ?? ''}
            onChange={(e) => onChange({ ...value, customPromptText: e.target.value || undefined })}
          />
          {active && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              Limpar personalização (usar só a Regra de Ouro)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
