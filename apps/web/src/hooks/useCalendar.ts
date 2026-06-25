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
  weeks: number;
  postsPerWeek: number;
  status: string;
  items: CalendarItem[];
}

export interface CalendarSummary {
  id: string;
  title: string;
  objective: string;
  startDate: string;
  weeks: number;
  postsPerWeek: number;
  createdAt: string;
  _count: { items: number };
}

export function useCalendars() {
  return useQuery<CalendarSummary[]>({ queryKey: ['calendars'], queryFn: () => api.get('/calendars') });
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
      void qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/calendars/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['calendars'] }),
  });
}
