import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface PromptField {
  value: string;
  isDefault: boolean;
}
export interface PromptSettings {
  goldenRulePrompt: PromptField;
  brandVoiceGuide: PromptField;
  creativeStructureGuide: PromptField;
  hooksGuide: PromptField;
}
export interface CustomPrompt {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Regra de Ouro + 3 guias (valores efetivos + flag "usando padrão"). */
export function usePromptSettings() {
  return useQuery<PromptSettings>({ queryKey: ['prompt-settings'], queryFn: () => api.get('/prompt-settings') });
}

export function useSavePromptSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Record<keyof PromptSettings, string>>) => api.put<PromptSettings>('/prompt-settings', data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['prompt-settings'] }),
  });
}

/** Prompts personalizados (para o picker e a aba Prompts). */
export function useCustomPrompts() {
  return useQuery<CustomPrompt[]>({ queryKey: ['custom-prompts'], queryFn: () => api.get('/custom-prompts') });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['custom-prompts'] });
}

export function useCreateCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string }) => api.post<CustomPrompt>('/custom-prompts', data),
    onSuccess: () => invalidate(qc),
  });
}
export function useUpdateCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; body?: string }) =>
      api.patch<CustomPrompt>(`/custom-prompts/${id}`, data),
    onSuccess: () => invalidate(qc),
  });
}
export function useDeleteCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/custom-prompts/${id}`),
    onSuccess: () => invalidate(qc),
  });
}
