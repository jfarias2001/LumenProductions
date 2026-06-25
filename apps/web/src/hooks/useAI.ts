import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/** Disponibilidade da camada de IA (decide se mostra os botões de copiloto). */
export function useAIStatus() {
  return useQuery<{ enabled: boolean }>({
    queryKey: ['ai-status'],
    queryFn: () => api.get('/ai/status'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Invalida card + board após uma ação de IA aplicar mudanças. */
function useCardInvalidation(cardId?: string) {
  const qc = useQueryClient();
  return () => {
    if (cardId) void qc.invalidateQueries({ queryKey: ['card', cardId] });
    void qc.invalidateQueries({ queryKey: ['board'] });
  };
}

export function useAIStructure(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: (rawText: string) => api.post('/ai/structure', { rawText, cardId }),
    onSuccess: invalidate,
  });
}

export function useAIValidate(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: () => api.post('/ai/validate', { cardId }),
    onSuccess: invalidate,
  });
}

export function useAIAngles(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: () => api.post('/ai/angles', { cardId }),
    onSuccess: invalidate,
  });
}

export function useAICopy(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: () => api.post('/ai/copy', { cardId }),
    onSuccess: invalidate,
  });
}

export function useAIDirection(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: () => api.post('/ai/direction', { cardId }),
    onSuccess: invalidate,
  });
}

export function useAIRecycle(cardId: string) {
  const invalidate = useCardInvalidation(cardId);
  return useMutation({
    mutationFn: () => api.post('/ai/recycle', { cardId }),
    onSuccess: invalidate,
  });
}

export function useAIProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signalIds: string[]) =>
      api.post<{ createdCardIds: string[] }>('/ai/prospect', { signalIds }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  });
}
