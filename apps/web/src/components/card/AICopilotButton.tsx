import { useAIStatus } from '../../hooks/useAI.js';

interface MutationLike {
  mutate: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

interface Props {
  label: string;
  mutation: MutationLike;
  /** Texto auxiliar abaixo do botão. */
  hint?: string;
}

/** Botão de copiloto de IA: respeita disponibilidade, mostra loading e fallback de erro. */
export default function AICopilotButton({ label, mutation, hint }: Props) {
  const { data: status } = useAIStatus();
  const disabled = status ? !status.enabled : false;

  const errMsg =
    mutation.isError && mutation.error instanceof Error ? mutation.error.message : null;
  const notConfigured = disabled || (mutation.error as { code?: string })?.code === 'AI_NOT_CONFIGURED';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || disabled} className="btn-ai">
          {mutation.isPending ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-ai-400/40 border-t-ai-400 animate-spin" />
              Gerando…
            </>
          ) : (
            <>✦ {label}</>
          )}
        </button>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>

      {notConfigured && (
        <p className="text-[11px] text-amber-300/80">
          IA indisponível — defina a chave OpenAI no backend ou preencha manualmente.
        </p>
      )}
      {errMsg && !notConfigured && (
        <p className="text-[11px] text-rose-300/90">Falha na IA: {errMsg}. Preencha manualmente.</p>
      )}
    </div>
  );
}
