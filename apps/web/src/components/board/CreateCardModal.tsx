import { useState } from 'react';
import { ContentType, StaticFormat, Pillar, SignalSource, Stage, STAGE_LABELS } from '@content-engine/shared';
import { useCreateCard } from '../../hooks/useBoard.js';
import { PILLAR_LABELS, SIGNAL_LABELS, CONTENT_TYPE_LABELS, STATIC_FORMAT_LABELS } from '../../lib/labels.js';

interface Props {
  onClose: () => void;
}

const INITIAL_STAGES = [Stage.SINAIS_MERCADO, Stage.IDEIAS_BRUTAS, Stage.IDEIAS_VALIDADAS];

export default function CreateCardModal({ onClose }: Props) {
  const create = useCreateCard();
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<Stage>(Stage.SINAIS_MERCADO);
  const [contentType, setContentType] = useState<ContentType>(ContentType.VIDEO);
  const [staticFormat, setStaticFormat] = useState<StaticFormat>(StaticFormat.IMAGEM_UNICA);
  const [pillar, setPillar] = useState<string>('');
  const [signalSource, setSignalSource] = useState<string>('');
  const [signalContent, setSignalContent] = useState('');
  const [error, setError] = useState('');

  const isSignal = stage === Stage.SINAIS_MERCADO;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({
        title: title.trim(),
        stage,
        contentType,
        ...(contentType === ContentType.ESTATICO ? { staticFormat } : {}),
        ...(pillar ? { pillar } : {}),
        ...(isSignal && signalSource ? { signalSource } : {}),
        ...(isSignal && signalContent ? { signalContent } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar card.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md surface-card shadow-card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Novo card</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-base">Título</label>
            <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} placeholder="Ex.: Dono de agência reclamando de lead ruim" autoFocus />
          </div>

          <div>
            <label className="label-base">Tipo de conteúdo</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(ContentType).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setContentType(t)}
                  className={`text-sm rounded-lg border px-3 py-2 transition-colors ${
                    contentType === t ? 'border-brand-500 bg-brand-600/15 text-brand-200' : 'border-surface-700 text-slate-400 hover:border-surface-600'
                  }`}
                >
                  {CONTENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {contentType === ContentType.ESTATICO && (
            <div>
              <label className="label-base">Formato do estático</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(StaticFormat).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setStaticFormat(f)}
                    className={`text-sm rounded-lg border px-3 py-2 transition-colors ${
                      staticFormat === f ? 'border-brand-500 bg-brand-600/15 text-brand-200' : 'border-surface-700 text-slate-400 hover:border-surface-600'
                    }`}
                  >
                    {STATIC_FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Imagem única = uma só arte. Carrossel = vários slides.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Estágio inicial</label>
              <select className="input-base" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
                {INITIAL_STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">Pilar</label>
              <select className="input-base" value={pillar} onChange={(e) => setPillar(e.target.value)}>
                <option value="">—</option>
                {Object.values(Pillar).map((p) => (
                  <option key={p} value={p}>{PILLAR_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {isSignal && (
            <>
              <div>
                <label className="label-base">Fonte do sinal</label>
                <select className="input-base" value={signalSource} onChange={(e) => setSignalSource(e.target.value)}>
                  <option value="">—</option>
                  {Object.values(SignalSource).map((s) => (
                    <option key={s} value={s}>{SIGNAL_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">Conteúdo do sinal</label>
                <textarea className="input-base h-24 resize-none" value={signalContent} onChange={(e) => setSignalContent(e.target.value)} placeholder="Cole aqui o print/transcrição/comentário…" />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
            <button type="submit" disabled={create.isPending || title.trim().length < 3} className="btn-primary text-sm">
              {create.isPending ? 'Criando…' : 'Criar card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
