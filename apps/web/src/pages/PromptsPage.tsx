import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.js';
import AppHeader from '../components/AppHeader.js';
import {
  usePromptSettings,
  useSavePromptSettings,
  useCustomPrompts,
  useCreateCustomPrompt,
  useUpdateCustomPrompt,
  useDeleteCustomPrompt,
  type PromptSettings,
} from '../hooks/usePrompts.js';

const FIELDS: { key: keyof PromptSettings; label: string; hint: string }[] = [
  { key: 'goldenRulePrompt', label: 'Regra de Ouro', hint: 'Posicionamento e regras centrais que embasam toda geração.' },
  { key: 'brandVoiceGuide', label: 'Voz da marca', hint: 'Tom de voz, o que falar e o que evitar, vocabulário.' },
  { key: 'creativeStructureGuide', label: 'Estrutura criativa', hint: 'Como estruturar o criativo (gancho → desenvolvimento → prova → CTA).' },
  { key: 'hooksGuide', label: 'Guia de hooks', hint: 'Categorias e regras das aberturas (primeiros segundos).' },
];

function PromptFieldEditor({ label, hint, value, isDefault, canEdit, onSave, saving }: {
  label: string; hint: string; value: string; isDefault: boolean; canEdit: boolean;
  onSave: (v: string) => void; saving: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  return (
    <div className="surface-card bg-surface-850 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
          {isDefault && <span className="badge bg-surface-700 text-slate-400">usando padrão</span>}
        </div>
        {canEdit && !editing && <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>Editar</button>}
      </div>
      <p className="text-[11px] text-slate-500">{hint}</p>
      {editing ? (
        <>
          <textarea className="input-base h-56 resize-y text-xs font-mono" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary text-xs" disabled={saving} onClick={() => { onSave(draft); setEditing(false); }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button className="btn-ghost text-xs" onClick={() => { setDraft(value); setEditing(false); }}>Cancelar</button>
            <button className="btn-ghost text-xs text-slate-500 ml-auto" title="Volta ao texto padrão do código" onClick={() => { onSave(''); setEditing(false); }}>Restaurar padrão</button>
          </div>
        </>
      ) : (
        <pre className="text-[11px] text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto surface-card bg-surface-900 p-2.5">{value}</pre>
      )}
    </div>
  );
}

function CustomPromptsManager({ canEdit }: { canEdit: boolean }) {
  const { data: prompts = [] } = useCustomPrompts();
  const create = useCreateCustomPrompt();
  const update = useUpdateCustomPrompt();
  const del = useDeleteCustomPrompt();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  function submit() {
    if (title.trim().length < 1 || body.trim().length < 1) return;
    if (editId) {
      update.mutate({ id: editId, title: title.trim(), body: body.trim() }, { onSuccess: reset });
    } else {
      create.mutate({ title: title.trim(), body: body.trim() }, { onSuccess: reset });
    }
  }
  function reset() { setTitle(''); setBody(''); setEditId(null); }
  function edit(p: { id: string; title: string; body: string }) { setEditId(p.id); setTitle(p.title); setBody(p.body); }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">Prompts personalizados</h3>
      <p className="text-[11px] text-slate-500">Prompts reutilizáveis que você pode SOMAR à Regra de Ouro na hora de gerar (funil e copy rápida).</p>

      {prompts.map((p) => (
        <div key={p.id} className="surface-card bg-surface-850 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-200 font-medium">{p.title}</span>
            {canEdit && (
              <div className="flex gap-1.5 shrink-0">
                <button className="btn-ghost text-xs" onClick={() => edit(p)}>Editar</button>
                <button className="btn-ghost text-xs text-rose-300" onClick={() => { if (confirm('Excluir?')) del.mutate(p.id); }}>Excluir</button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 whitespace-pre-wrap">{p.body}</p>
        </div>
      ))}
      {!prompts.length && <p className="text-xs text-slate-600">Nenhum prompt personalizado ainda.</p>}

      {canEdit && (
        <div className="surface-card bg-surface-850 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-300">{editId ? 'Editar prompt' : 'Novo prompt personalizado'}</p>
          <input className="input-base text-sm" placeholder="Título (ex.: Foco em prova social)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-base h-28 resize-none text-xs" placeholder="Instruções que serão somadas à Regra de Ouro…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={submit} disabled={create.isPending || update.isPending}>{editId ? 'Salvar' : 'Adicionar'}</button>
            {editId && <button className="btn-ghost text-xs" onClick={reset}>Cancelar</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'ADMIN' || role === 'GESTOR';
  const { data: settings, isLoading } = usePromptSettings();
  const save = useSavePromptSettings();

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white font-display">Prompts</h2>
            <p className="text-xs text-slate-500">
              Veja e edite a Regra de Ouro e os guias que embasam toda geração de IA.
              {!canEdit && ' (edição restrita a ADMIN/GESTOR)'}
            </p>
          </div>

          {isLoading || !settings ? (
            <p className="text-sm text-slate-500 animate-pulse">Carregando…</p>
          ) : (
            <>
              <div className="space-y-3">
                {FIELDS.map((f) => (
                  <PromptFieldEditor
                    key={f.key}
                    label={f.label}
                    hint={f.hint}
                    value={settings[f.key].value}
                    isDefault={settings[f.key].isDefault}
                    canEdit={canEdit}
                    saving={save.isPending}
                    onSave={(v) => save.mutate({ [f.key]: v })}
                  />
                ))}
              </div>
              <CustomPromptsManager canEdit={canEdit} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
