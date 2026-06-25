import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface GraphicElement {
  slide?: number | string;
  headline?: string;
  body?: string;
  visual?: string;
  layout?: string;
  font?: string;
  fontSize?: string;
  colors?: string;
}

export interface Shot {
  scene?: string;
  durationSec?: number | string;
  visual?: string;
  screenText?: string;
  voiceover?: string;
}

export interface Typography {
  headingFont?: string;
  bodyFont?: string;
  notes?: string;
}

export type Deliverable =
  | {
      type: 'VIDEO';
      title: string;
      hook: string | null;
      script: Record<string, unknown> | null;
      screenTexts: string[];
      editingInsights: string[];
      voiceTone: string | null;
      shotList: Shot[];
      typography: Typography | null;
      palette: string | null;
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
      typography: Typography | null;
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
