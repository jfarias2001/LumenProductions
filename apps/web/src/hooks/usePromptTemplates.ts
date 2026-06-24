import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Stage } from '@content-engine/shared';

export interface PromptTemplate {
  id: string;
  stage: Stage;
  title: string;
  body: string;
  isDefault: boolean;
  order: number;
  builtIn: boolean;
}

/** Templates de prompt de uma fase (sugestões padrão da conversa). */
export function usePromptTemplates(stage: Stage) {
  return useQuery<PromptTemplate[]>({
    queryKey: ['prompt-templates', stage],
    queryFn: () => api.get(`/prompt-templates?stage=${stage}`),
    staleTime: 5 * 60 * 1000,
  });
}
