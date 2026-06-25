import { useEffect, useState } from 'react';
import type { CompanyProfileInput, CompanyPersona } from '@content-engine/shared';
import { useCompanyProfile, useSaveCompanyProfile } from '../hooks/useCompany.js';
import { useAuthStore } from '../store/auth.js';
import AppHeader from '../components/AppHeader.js';

const EMPTY: CompanyProfileInput = {
  companyName: '',
  about: '',
  offerings: '',
  personas: [],
  mainPains: '',
  toneOfVoice: '',
  differentiators: '',
  proofCases: '',
  dos: [],
  donts: [],
  keywords: [],
  links: [],
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {hint && <p className="text-[11px] text-slate-500 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

/** Editor de lista de strings (do's, don'ts, keywords, links). */
function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="badge bg-surface-700 text-slate-200 inline-flex items-center gap-1">
            {it}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-300">×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-[11px] text-slate-600">Nenhum item.</span>}
      </div>
      <div className="flex gap-1.5">
        <input
          className="input-base !py-1.5"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} className="btn-ghost text-xs whitespace-nowrap">Adicionar</button>
      </div>
    </div>
  );
}

export default function CompanyProfilePage() {
  const { data, isLoading } = useCompanyProfile();
  const save = useSaveCompanyProfile();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'ADMIN' || role === 'GESTOR';

  const [form, setForm] = useState<CompanyProfileInput>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setForm({ ...EMPTY, ...data }); }, [data]);

  function set<K extends keyof CompanyProfileInput>(key: K, value: CompanyProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function updatePersona(idx: number, patch: Partial<CompanyPersona>) {
    set('personas', form.personas.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function submit() {
    save.mutate(form, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); } });
  }

  return (
    <div className="flex flex-col h-screen bg-surface-950">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Base de Conhecimento da Empresa</h2>
            <p className="text-sm text-slate-400">Estes dados embasam toda a IA (ideias, calendário, copy, direção). Quanto mais completo, mais o conteúdo soa como a sua empresa.</p>
          </div>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Carregando…</p>
          ) : (
            <div className="surface-card p-5 space-y-4">
              <Field label="Nome da empresa">
                <input className="input-base" value={form.companyName} disabled={!canEdit} onChange={(e) => set('companyName', e.target.value)} />
              </Field>
              <Field label="Quem é / posicionamento" hint="O que a empresa faz, para quem, qual a grande promessa.">
                <textarea className="input-base min-h-[80px]" value={form.about} disabled={!canEdit} onChange={(e) => set('about', e.target.value)} />
              </Field>
              <Field label="Ofertas / produtos / serviços">
                <textarea className="input-base min-h-[70px]" value={form.offerings} disabled={!canEdit} onChange={(e) => set('offerings', e.target.value)} />
              </Field>
              <Field label="Dores principais do público">
                <textarea className="input-base min-h-[70px]" value={form.mainPains} disabled={!canEdit} onChange={(e) => set('mainPains', e.target.value)} />
              </Field>
              <Field label="Tom de voz" hint="Ex.: direto, provocador, sem jargão.">
                <input className="input-base" value={form.toneOfVoice} disabled={!canEdit} onChange={(e) => set('toneOfVoice', e.target.value)} />
              </Field>
              <Field label="Diferenciais">
                <textarea className="input-base min-h-[70px]" value={form.differentiators} disabled={!canEdit} onChange={(e) => set('differentiators', e.target.value)} />
              </Field>
              <Field label="Provas / casos de sucesso">
                <textarea className="input-base min-h-[70px]" value={form.proofCases} disabled={!canEdit} onChange={(e) => set('proofCases', e.target.value)} />
              </Field>

              {/* Personas */}
              <div>
                <label className="label-base">Personas</label>
                <div className="space-y-2">
                  {form.personas.map((p, i) => (
                    <div key={i} className="border border-surface-700 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input className="input-base !py-1.5" placeholder="Nome da persona" value={p.name} disabled={!canEdit} onChange={(e) => updatePersona(i, { name: e.target.value })} />
                        {canEdit && (
                          <button type="button" onClick={() => set('personas', form.personas.filter((_, j) => j !== i))} className="btn-ghost text-xs whitespace-nowrap text-rose-300">Remover</button>
                        )}
                      </div>
                      <input className="input-base !py-1.5" placeholder="Descrição" value={p.description} disabled={!canEdit} onChange={(e) => updatePersona(i, { description: e.target.value })} />
                      <input className="input-base !py-1.5" placeholder="Dores dessa persona" value={p.pains} disabled={!canEdit} onChange={(e) => updatePersona(i, { pains: e.target.value })} />
                    </div>
                  ))}
                  {canEdit && (
                    <button type="button" onClick={() => set('personas', [...form.personas, { name: '', description: '', pains: '' }])} className="btn-ghost text-xs">+ Adicionar persona</button>
                  )}
                </div>
              </div>

              <Field label="Do's (fazer)"><ListEditor items={form.dos} onChange={(v) => set('dos', v)} placeholder="Ex.: sempre dar exemplo de agência" /></Field>
              <Field label="Don'ts (evitar)"><ListEditor items={form.donts} onChange={(v) => set('donts', v)} placeholder="Ex.: nunca começar vendendo o CRM" /></Field>
              <Field label="Palavras-chave / temas"><ListEditor items={form.keywords} onChange={(v) => set('keywords', v)} placeholder="Ex.: leads ruins, ticket médio" /></Field>
              <Field label="Links de referência"><ListEditor items={form.links} onChange={(v) => set('links', v)} placeholder="https://…" /></Field>

              {canEdit ? (
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={submit} disabled={save.isPending} className="btn-primary text-sm">
                    {save.isPending ? 'Salvando…' : 'Salvar base'}
                  </button>
                  {saved && <span className="text-emerald-400 text-sm">✓ Base salva</span>}
                  {save.isError && <span className="text-rose-300 text-sm">Erro ao salvar.</span>}
                </div>
              ) : (
                <p className="text-[11px] text-amber-300/80">Somente ADMIN/GESTOR podem editar a base.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
