import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { useUIStore } from '../store/ui.js';
import type { Stage } from '@content-engine/shared';

export interface CardSummary {
  id: string;
  stage: Stage;
  title: string;
  pillar?: string;
  awareness?: string;
  contentClass?: string;
  assignee?: { id: string; name: string; role: string };
  validation?: { total: number; verdict: string };
  updatedAt: string;
  _count?: { checklistItems: number; hooks: number };
}

export function useBoard() {
  const qc = useQueryClient();
  const filters = useUIStore((s) => s.boardFilters);

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }

  const query = useQuery<CardSummary[]>({
    queryKey: ['board', filters],
    queryFn: () => api.get(`/board${params.size ? `?${params}` : ''}`),
  });

  // Realtime board sync
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => void qc.invalidateQueries({ queryKey: ['board'] });
    socket.on('card.created', refresh);
    socket.on('card.moved', refresh);
    socket.on('card.updated', refresh);
    socket.on('card.archived', refresh);
    return () => {
      socket.off('card.created', refresh);
      socket.off('card.moved', refresh);
      socket.off('card.updated', refresh);
      socket.off('card.archived', refresh);
    };
  }, [qc]);

  return query;
}

export function useTransitionCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, to }: { cardId: string; to: Stage }) =>
      api.post(`/cards/${cardId}/transition`, { to }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/cards', data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  });
}

export function useArchiveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.post(`/cards/${cardId}/archive`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  });
}

export type CardDetailData = Record<string, unknown> & {
  stage: Stage;
  title: string;
  pillar?: string | null;
  assignee?: { id: string; name: string; role: string } | null;
  updatedAt: string;
};

export function useCard(id: string | null) {
  return useQuery({
    queryKey: ['card', id],
    queryFn: () => api.get<CardDetailData>(`/cards/${id}`),
    enabled: !!id,
  });
}
