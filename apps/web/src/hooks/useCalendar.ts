import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GenerateCalendarInput, Pillar, ContentType, StaticFormat, CreativeFormat } from '@content-engine/shared';
import { api } from '../lib/api.js';

export interface CalendarItem {
  id: string;
  position: number;
  scheduledFor: string;
  title: string;
  pillar: Pillar | null;
  contentType: ContentType;
  staticFormat: StaticFormat | null;
  isAd: boolean;
  format: CreativeFormat | null;
  persona: string | null;
  pain: string | null;
  promise: string | null;
  connection: string | null;
  cardId: string | null;
}

export interface CalendarDetail {
  id: string;
  title: string;
  objective: string;
  theme: string | null;
  startDate: string;
  endDate: string | null;
  videoCount: number | null;
  postCount: number | null;
  carrosselCount: number | null;
  adVideoCount: number | null;
  status: string;
  items: CalendarItem[];
}

export interface CalendarSummary {
  id: string;
  title: string;
  objective: string;
  startDate: string;
  endDate: string | null;
  videoCount: number | null;
  postCount: number | null;
  carrosselCount: number | null;
  adVideoCount: number | null;
  createdAt: string;
  _count: { items: number };
}

/** Item agregado (visão geral de todos os calendários) — carrega o calendário de origem. */
export interface AllCalendarItem extends CalendarItem {
  calendarId: string;
  calendar: { id: string; title: string };
}

export function useCalendars() {
  return useQuery<CalendarSummary[]>({ queryKey: ['calendars'], queryFn: () => api.get('/calendars') });
}

/** Todos os itens de todos os calendários — alimenta a grade mensal unificada (PRD-013). */
export function useAllCalendarItems() {
  return useQuery<AllCalendarItem[]>({
    queryKey: ['calendar-items-all'],
    queryFn: () => api.get('/calendars/items/all'),
  });
}

export function useCalendar(id: string | null) {
  return useQuery<CalendarDetail>({
    queryKey: ['calendar', id],
    queryFn: () => api.get(`/calendars/${id}`),
    enabled: !!id,
  });
}

export function useGenerateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateCalendarInput) => api.post<CalendarDetail>('/calendars/generate', input),
    onSuccess: (cal) => {
      void qc.invalidateQueries({ queryKey: ['calendars'] });
      void qc.invalidateQueries({ queryKey: ['calendar-items-all'] });
      qc.setQueryData(['calendar', cal.id], cal);
    },
  });
}

export function useSendCalendarItem(calendarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.post<{ card: { id: string }; created: boolean }>(`/calendars/${calendarId}/items/${itemId}/send-to-pipeline`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar', calendarId] });
      void qc.invalidateQueries({ queryKey: ['calendar-items-all'] });
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

/** Marca/desmarca um item do calendário como anúncio (PRD-009). */
export function useSetItemAd(calendarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isAd }: { itemId: string; isAd: boolean }) =>
      api.patch<{ id: string; isAd: boolean }>(`/calendars/${calendarId}/items/${itemId}`, { isAd }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar', calendarId] });
      void qc.invalidateQueries({ queryKey: ['calendar-items-all'] });
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export interface AutoProduceResult {
  produced: number;
  skipped: number;
  failed: number;
  errors: Array<{ itemId: string; title: string; message: string }>;
}

export function useAutoProduceCalendar(calendarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AutoProduceResult>(`/calendars/${calendarId}/auto-produce`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar', calendarId] });
      void qc.invalidateQueries({ queryKey: ['calendar-items-all'] });
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/calendars/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendars'] });
      void qc.invalidateQueries({ queryKey: ['calendar-items-all'] });
    },
  });
}
