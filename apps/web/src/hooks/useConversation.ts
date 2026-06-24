import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { Stage } from '@content-engine/shared';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface Conversation {
  id: string;
  cardId: string;
  stage: Stage;
  messages: ChatMsg[];
}

/** Histórico da conversa de uma fase. */
export function useConversation(cardId: string, stage: Stage) {
  return useQuery<Conversation>({
    queryKey: ['conversation', cardId, stage],
    queryFn: () => api.get(`/cards/${cardId}/conversations/${stage}`),
  });
}

/**
 * Envia uma mensagem e consome o stream SSE da resposta da IA, atualizando o texto
 * parcial em tempo real. Ao concluir, invalida o histórico da conversa.
 */
export function useSendMessage(cardId: string, stage: Stage) {
  const qc = useQueryClient();
  const [streaming, setStreaming] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      setPending(true);
      setStreaming('');
      setError(null);

      const token = localStorage.getItem('access_token') ?? '';
      const res = await fetch(`/api/v1/cards/${cardId}/conversations/${stage}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.code === 'AI_NOT_CONFIGURED' ? 'AI_NOT_CONFIGURED' : (body?.error?.message ?? 'Falha na IA.'));
        setPending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const block of events) {
          const eventLine = block.split('\n').find((l) => l.startsWith('event:'));
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const event = eventLine?.slice(6).trim();
          const payload = JSON.parse(dataLine.slice(5).trim());
          if (event === 'token') {
            acc += payload.delta;
            setStreaming(acc);
          } else if (event === 'error') {
            setError(payload.code === 'AI_NOT_CONFIGURED' ? 'AI_NOT_CONFIGURED' : payload.message);
          }
        }
      }

      setPending(false);
      setStreaming('');
      await qc.invalidateQueries({ queryKey: ['conversation', cardId, stage] });
    },
    [cardId, stage, qc],
  );

  return { send, streaming, pending, error };
}

/** Consolida a conversa da fase nas entidades do card. */
export function useConsolidate(cardId: string, stage: Stage) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/cards/${cardId}/conversations/${stage}/consolidate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['card', cardId] });
      void qc.invalidateQueries({ queryKey: ['deliverable', cardId] });
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

/** Gera o entregável da fase a partir de um contexto fornecido (PRD-004). */
export function useGenerate(cardId: string, stage: Stage) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (context?: string) =>
      api.post(`/cards/${cardId}/conversations/${stage}/generate`, { context }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversation', cardId, stage] });
      void qc.invalidateQueries({ queryKey: ['card', cardId] });
      void qc.invalidateQueries({ queryKey: ['deliverable', cardId] });
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
