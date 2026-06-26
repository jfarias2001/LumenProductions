# SPEC-008 — Calendário por período + quantidade por tipo

Implementa o PRD-008. Substitui a cadência `weeks × postsPerWeek` por **período (start/end)** + **quantidades por tipo** (vídeos, posts, carrosséis).

## 1. Shared (`packages/shared`)

Reescrever `GenerateCalendarInputSchema`:

```ts
export const GenerateCalendarInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    objective: z.string().min(1).max(2000),
    startDate: z.string().min(8),       // ISO yyyy-mm-dd
    endDate: z.string().min(8),         // ISO yyyy-mm-dd
    videoCount: z.number().int().min(0).max(60).default(0),
    postCount: z.number().int().min(0).max(60).default(0),
    carrosselCount: z.number().int().min(0).max(60).default(0),
    notes: z.string().max(4000).optional(),
  })
  .refine((d) => d.videoCount + d.postCount + d.carrosselCount >= 1, {
    message: 'Defina ao menos 1 conteúdo (vídeo, post ou carrossel).',
  })
  .refine((d) => d.videoCount + d.postCount + d.carrosselCount <= 60, {
    message: 'Total de peças não pode passar de 60.',
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'A data fim deve ser igual ou posterior à data início.',
  });
```

Remove `weeks`, `postsPerWeek`, `contentTypes`. `AICalendarItemSchema` permanece (o campo `week` deixa de ser usado no planejamento de datas, mas continua tolerado). `ContentTypeLoose`/`FormatLoose` etc. permanecem.

## 2. Prisma (`apps/api`)

`EditorialCalendar`: tornar `weeks`/`postsPerWeek` **opcionais** e adicionar período + contagens:

```prisma
weeks          Int?
postsPerWeek   Int?
endDate        DateTime?
videoCount     Int?
postCount      Int?
carrosselCount Int?
```

Migration aditiva `20260626000100_calendar_period` (idempotente):
```sql
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "videoCount" INTEGER;
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "postCount" INTEGER;
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "carrosselCount" INTEGER;
ALTER TABLE "EditorialCalendar" ALTER COLUMN "weeks" DROP NOT NULL;
ALTER TABLE "EditorialCalendar" ALTER COLUMN "postsPerWeek" DROP NOT NULL;
```

## 3. Backend — IA (`ai.service.ts` → `generateCalendar`)

- Calcula `total = videoCount + postCount + carrosselCount` e o nº de dias do período.
- System prompt mantém Regra de Ouro + Instagram + mix-alvo + narrativa conectada.
- User prompt pede **exatamente**: `videoCount` itens VIDEO, `postCount` itens ESTATICO/IMAGEM_UNICA, `carrosselCount` itens ESTATICO/CARROSSEL (total `total`), ordenados formando a sequência. Mantém o JSON de saída atual (com `staticFormat`).

## 4. Backend — orquestração (`calendar.service.ts`)

- `planDates` → distribuição **uniforme no período**: `offset_i = round(i * spanDays / (total-1))`, `spanDays = round((endDate - startDate)/dia)`. Cada item recebe `position` e `scheduledFor = startDate + offset` (startDate já é 09:00).
- `generateAndSave`: grava `endDate`, `videoCount`, `postCount`, `carrosselCount` (não grava mais `weeks`/`postsPerWeek`). Fallback de `contentType` por item: VIDEO.
- `sendItemToPipeline` e `autoProduceCalendar`: **inalterados**.

## 5. Backend — rota (`calendar.ts`)
`POST /calendars/generate` continua validando com `GenerateCalendarInputSchema` (já cobre o novo shape). Sem outras mudanças.

## 6. Frontend (`apps/web`)

- `useCalendar.ts`: `CalendarDetail`/`CalendarSummary` ganham `endDate`, `videoCount`, `postCount`, `carrosselCount`; `weeks`/`postsPerWeek` viram opcionais.
- `CalendarPage.tsx`:
  - Form: data **início** + data **fim**; 3 campos numéricos **Vídeos / Posts / Carrosséis**; remove checkboxes e "posts/sem". Total exibido = soma.
  - Detalhe: agrupar por "Semana N" derivada do período (`floor((scheduledFor - startDate)/7dias)+1`) em vez de `data.weeks`.
  - Lista: linha-resumo mostra total + período em vez de `weeks/postsPerWeek`.

## 7. Validação
`pnpm -r typecheck`, `vite build` do web, `prisma generate`, rebuild do `dist` do shared. Migration aplicada com `prisma migrate deploy`.
