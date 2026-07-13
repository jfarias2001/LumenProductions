# SPEC-013 — Guia de hooks nos roteiros + visão geral do calendário

**PRD:** PRD-013 · **Data:** 2026-07-13

## 1. `packages/shared`

### 1.1 `constants.ts`
- Nova constante `HOOKS_GUIDE` — guia de abertura de Reels destilado do artigo: as 5 categorias (pergunta provocativa, choque numérico, paradoxo, promessa específica, confissão), a regra dos primeiros 3s / retenção, comprimento 10–18 palavras, e os 3 erros a evitar. Exemplos adaptados ao dono de agência.

> Rebuild do `dist` do shared.

## 2. Backend (`apps/api`)

### 2.1 `ai.service.ts` — injeção do guia (só onde se cria abertura)
- Importa `HOOKS_GUIDE`.
- `angles()`: `system` ganha `\n${HOOKS_GUIDE}`; o user prompt pede para aplicar/variar as 5 categorias e manter 10–18 palavras por hook.
- `adCreative()`: `system` ganha `\n${HOOKS_GUIDE}`; o campo `hook` (3s de tráfego frio) referencia o guia.
- `generateCalendar()`: `system` ganha `\n${HOOKS_GUIDE}`; o user prompt explicita que os TÍTULOS funcionam como hook de abertura e devem seguir o guia.
- Sem mudança em `copy`/`direction` (consomem hooks, não os criam).

### 2.2 `calendar.service.ts`
- Nova `listAllItems()` — todos os `EditorialCalendarItem` ordenados por `scheduledFor`, com `include: { calendar: { select: { id, title } } }`.

### 2.3 `routes/calendar.ts`
- `GET /calendars/items/all` (perm. `viewBoard`) → `calendarService.listAllItems()`. Caminho de 3 segmentos, sem conflito com `/calendars/:id`.

### 2.4 Sem mudança
- Schema Prisma, migrations, pipeline, gates — inalterados.

## 3. Frontend (`apps/web`)

### 3.1 `hooks/useCalendar.ts`
- Tipo `AllCalendarItem = CalendarItem & { calendarId: string; calendar: { id: string; title: string } }`.
- `useAllCalendarItems()` → `GET /calendars/items/all` (queryKey `['calendar-items-all']`).
- As mutations de calendário (`generate`, `delete`, `send`, `setItemAd`, `autoProduce`) passam a invalidar também `['calendar-items-all']`.

### 3.2 `CalendarPage.tsx`
- `CalendarMonthView` generalizado: `startDate` opcional (default = hoje); itens podem carregar `calendar.title` (mostrado no tooltip da célula, útil na visão geral).
- Lista de calendários ganha uma entrada no topo **"📅 Geral (todos)"**; ativa quando `selectedId === null`.
- `selectedId` inicia `null` → o painel direito abre na **visão geral**: grade mensal com os itens de todos os calendários (`useAllCalendarItems`), read-only, iniciando no mês do item mais próximo (ou hoje). Selecionar um calendário mostra o `CalendarDetailView` como hoje; selecionar "Geral" volta à visão unificada.

## 4. Validação
- `pnpm --filter @content-engine/shared build`; `pnpm --filter api typecheck`; `pnpm --filter web typecheck`.
- Sem migração. Deploy: rebuild dos containers (`make deploy`).
