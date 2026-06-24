import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface GraphicElement {
  slide?: number | string;
  headline?: string;
  body?: string;
  visual?: string;
}

export type Deliverable =
  | {
      type: 'VIDEO';
      title: string;
      hook: string | null;
      script: Record<string, unknown> | null;
      screenTexts: string[];
      editingInsights: string[];
      format: string | null;
      caption: string | null;
      ctaVariations: string[];
    }
  | {
      type: 'ESTATICO';
      title: string;
      format: string | null;
      caption: string | null;
      ctaVariations: string[];
      graphicElements: GraphicElement[];
      palette: string | null;
    };

/** Pacote final consolidado do card (formato depende do tipo de conteúdo). */
export function useDeliverable(cardId: string, enabled = true) {
  return useQuery<Deliverable>({
    queryKey: ['deliverable', cardId],
    queryFn: () => api.get(`/cards/${cardId}/deliverable`),
    enabled,
  });
}
