import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type {
  V2IdeasOutput,
  V2TitlesOutput,
  V2FocusOutput,
  V2CopyOutput,
  PromptChoiceInput,
} from '@content-engine/shared';

export interface V2Card {
  id: string;
  stage: string;
  idea: string;
  title: string;
  focus: string;
  copy: string;
  ctas: string[];
  customPromptId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lista de cards do BOARD V2. */
export function useV2Cards() {
  return useQuery<V2Card[]>({ queryKey: ['v2-cards'], queryFn: () => api.get('/v2/cards') });
}

function invalidateV2(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['v2-cards'] });
}

// ── Funil (cada passo é uma chamada de IA) ────────────────────────────────────
export function useV2Ideas() {
  return useMutation({
    mutationFn: (body: { context?: string } & PromptChoiceInput) =>
      api.post<V2IdeasOutput>('/v2/ideas', body),
  });
}
export function useV2Titles() {
  return useMutation({
    mutationFn: (body: { idea: string } & PromptChoiceInput) => api.post<V2TitlesOutput>('/v2/titles', body),
  });
}
export function useV2Focus() {
  return useMutation({
    mutationFn: (body: { idea: string; title: string } & PromptChoiceInput) =>
      api.post<V2FocusOutput>('/v2/focus', body),
  });
}
export function useV2Copy() {
  return useMutation({
    mutationFn: (body: { idea: string; title: string; focus: string } & PromptChoiceInput) =>
      api.post<V2CopyOutput>('/v2/copy', body),
  });
}

/** Copy rápida (aba Teste). */
export function useQuickCopy() {
  return useMutation({
    mutationFn: (body: { prompt: string } & PromptChoiceInput) => api.post<V2CopyOutput>('/v2/quick-copy', body),
  });
}

// ── CRUD dos cards V2 ─────────────────────────────────────────────────────────
export function useCreateV2Card() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      idea: string;
      title: string;
      focus?: string;
      copy?: string;
      ctas?: string[];
      customPromptId?: string;
    }) => api.post<V2Card>('/v2/cards', body),
    onSuccess: () => invalidateV2(qc),
  });
}

export function useUpdateV2Card() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<V2Card>(`/v2/cards/${id}`, data),
    onSuccess: () => invalidateV2(qc),
  });
}

export function useDeleteV2Card() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/v2/cards/${id}`),
    onSuccess: () => invalidateV2(qc),
  });
}
