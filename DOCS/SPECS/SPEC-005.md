# SPEC-005 — Base de Conhecimento da Empresa + Calendário Editorial com IA

> Especificação técnica do PRD-005. Reusa a infra de IA existente (`AIProvider`, `run()` com observabilidade `AIJob`, Regra de Ouro lida do `AppSetting`) e o pipeline de 18 estágios sem alterá-lo.

---

## 1. Visão geral

Duas capacidades novas:

1. **CompanyProfile** — singleton estruturado com os dados da empresa. Injetado como bloco de dado no system prompt de toda função de IA via `goldenRule()` (renomeado conceitualmente para "base do system prompt"). Default vazio → comportamento atual inalterado.
2. **EditorialCalendar** — gerador de sequência de posts encadeados. `aiService.generateCalendar()` produz o conteúdo; `calendar.service` distribui datas e persiste. Cada item pode virar um `Card` em `IDEIAS_BRUTAS`.

Nenhuma mudança em `PipelineService`, gates, ou estágios.

## 2. Shared (`packages/shared`)

### 2.1 `schemas.ts` — novos schemas Zod

```ts
// Base de conhecimento
export const CompanyPersonaSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  pains: z.string().default(''),
});

export const CompanyProfileSchema = z.object({
  companyName: z.string().default(''),
  about: z.string().default(''),
  offerings: z.string().default(''),
  personas: z.array(CompanyPersonaSchema).default([]),
  mainPains: z.string().default(''),
  toneOfVoice: z.string().default(''),
  differentiators: z.string().default(''),
  proofCases: z.string().default(''),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
});
export type CompanyProfileInput = z.infer<typeof CompanyProfileSchema>;

// Geração do calendário (input do usuário)
export const GenerateCalendarInputSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),       // tema/objetivo do período
  startDate: z.string(),              // ISO date (yyyy-mm-dd)
  weeks: z.number().int().min(1).max(12),
  postsPerWeek: z.number().int().min(1).max(14),
  contentTypes: z.array(z.nativeEnum(ContentType)).min(1).default([ContentType.VIDEO, ContentType.ESTATICO]),
  notes: z.string().optional(),
});
export type GenerateCalendarInput = z.infer<typeof GenerateCalendarInputSchema>;

// Saída da IA (conteúdo do calendário) — usa coerceEnum p/ pilar/tipo/formato
export const AICalendarItemSchema = z.object({
  week: z.number().int().min(1),
  title: z.string(),                  // hook/título curto
  pillar: coerceEnum(Pillar).optional(),
  contentType: coerceEnum(ContentType).optional(),
  format: coerceEnum(CreativeFormat).optional(),
  persona: z.string().optional(),
  pain: z.string().optional(),
  promise: z.string().optional(),     // objetivo da peça
  connection: z.string().optional(),  // como engata na sequência (fio narrativo)
});
export const AICalendarOutputSchema = z.object({
  theme: z.string(),                  // fio condutor geral
  items: z.array(AICalendarItemSchema).min(1),
});
export type AICalendarOutput = z.infer<typeof AICalendarOutputSchema>;
```

> `coerceEnum` já existe (criado no fix de consolidação do PRD-003) e mapeia rótulo/frase → valor do enum sem acento/case-insensitive.

## 3. Banco (Prisma) — migration `20260625000000_company_and_calendar` (aditiva)

```prisma
model CompanyProfile {
  id              String   @id @default("singleton")
  companyName     String   @default("")
  about           String   @default("")
  offerings       String   @default("")
  personas        Json     @default("[]")   // [{name, description, pains}]
  mainPains       String   @default("")
  toneOfVoice     String   @default("")
  differentiators String   @default("")
  proofCases      String   @default("")
  dos             String[] @default([])
  donts           String[] @default([])
  keywords        String[] @default([])
  links           String[] @default([])
  updatedAt       DateTime @updatedAt
}

model EditorialCalendar {
  id           String   @id @default(cuid())
  title        String
  objective    String
  theme        String?                       // fio condutor devolvido pela IA
  startDate    DateTime
  weeks        Int
  postsPerWeek Int
  status       String   @default("draft")
  createdById  String?
  items        EditorialCalendarItem[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model EditorialCalendarItem {
  id           String             @id @default(cuid())
  calendarId   String
  calendar     EditorialCalendar  @relation(fields: [calendarId], references: [id], onDelete: Cascade)
  position     Int                                  // ordem na sequência (0-based)
  scheduledFor DateTime                             // data calculada pelo backend
  title        String
  pillar       Pillar?
  contentType  ContentType        @default(VIDEO)
  format       CreativeFormat?
  persona      String?
  pain         String?
  promise      String?
  connection   String?
  cardId       String?            @unique           // vínculo quando vira card
  card         Card?              @relation(fields: [cardId], references: [id], onDelete: SetNull)
  createdAt    DateTime           @default(now())

  @@index([calendarId])
}
```

No `Card`, adicionar a relação inversa (opcional p/ Prisma): `calendarItem EditorialCalendarItem?`.

## 4. Backend (`apps/api`)

### 4.1 `services/company.service.ts`
- `getCompanyProfile()` → busca singleton; se não existir, retorna objeto vazio padronizado (não cria).
- `updateCompanyProfile(input: CompanyProfileInput)` → `upsert` em `id: 'singleton'`.
- `buildCompanyContext(): Promise<string>` → monta um bloco de texto compacto com os campos preenchidos (omite vazios). Retorna `''` se não houver nada. Formato pronto para `dataBlock('Base de conhecimento da empresa', ...)`.

### 4.2 `services/ai.service.ts` — injeção de contexto
- `goldenRule()` passa a anexar o contexto da empresa: retorna `GOLDEN_RULE_PROMPT (do AppSetting)` + (se houver) `\n\n` + `dataBlock('Base de conhecimento da empresa', companyContext)`. Como o default da Base é vazio, todas as 7 funções existentes seguem idênticas até o usuário preencher.
- Nova função **`generateCalendar(input, userId)`**:
  - `system = await goldenRule()` + instrução de planejamento + mix-alvo 60/25/15 + a Regra de Ouro aplicada à sequência.
  - `user` = bloco de dado com `objective/notes/weeks/postsPerWeek/contentTypes` + nº total de itens desejado (`weeks * postsPerWeek`) + pedido de `theme` + `items` conectados (cada item com `week, title, pillar, contentType, format, persona, pain, promise, connection`).
  - `run({ type: 'calendar', schema: AICalendarOutputSchema, ... , temperature: 0.7 })`.

### 4.3 `services/calendar.service.ts`
- `generateAndSave(input, userId)`:
  1. chama `aiService.generateCalendar(input, userId)`.
  2. calcula `scheduledFor` de cada item: distribui `postsPerWeek` dias úteis a partir de `startDate`, por semana (espaçamento simples — ex.: seg/qua/sex se 3/semana; caso geral: distribui uniformemente nos 7 dias). Ordena por `week` e ordem de chegada → `position`.
  3. cria `EditorialCalendar` + `EditorialCalendarItem[]` (createMany).
  4. retorna o calendário com itens.
- `list()`, `getById(id)`.
- `sendItemToPipeline(itemId, userId)`:
  - se `item.cardId` já existe → retorna o card existente (idempotente).
  - cria `Card` em `IDEIAS_BRUTAS` com `title/persona/pain/promise/pillar/contentType`; cria `CardStageHistory`; vincula `item.cardId`; `emitBoard('card.created', card)`.
- `remove(id)`.

### 4.4 Rotas — `routes/calendar.ts` (registrado com prefixo `/api/v1`)
| Método | Rota | Permissão | Ação |
|--------|------|-----------|------|
| GET | `/company-profile` | `viewBoard` | lê o perfil |
| PUT | `/company-profile` | `manageCompany` | upsert do perfil |
| GET | `/calendars` | `viewBoard` | lista calendários |
| GET | `/calendars/:id` | `viewBoard` | detalhe + itens |
| POST | `/calendars/generate` | `useAI` | gera e salva (503 sem chave, 502 em falha) |
| POST | `/calendars/:id/items/:itemId/send-to-pipeline` | `createCard` | item → card |
| DELETE | `/calendars/:id` | `manageCompany` | remove |

Erros de IA reutilizam o helper `aiError` (503/502).

### 4.5 Permissões — `plugins/auth.ts`
- Nova `manageCompany: [Role.ADMIN, Role.GESTOR]`.

### 4.6 Seed
- Cria `CompanyProfile` singleton vazio (idempotente) — opcional; a leitura já tolera ausência.

## 5. Frontend (`apps/web`)

### 5.1 Navegação
- Header do board ganha links: **Board · Base da Empresa · Calendário** (rotas `/`, `/empresa`, `/calendario`). React Router v6.

### 5.2 Base da Empresa (`/empresa`)
- `pages/CompanyProfilePage.tsx` + `components/company/CompanyProfileForm.tsx` (React Hook Form + Zod).
- Campos texto + editores de lista simples (personas, dos/donts, keywords, links — add/remove).
- Botão Salvar → `PUT /company-profile`. Aviso "estes dados embasam a IA".
- Hook `useCompanyProfile` (query + mutation).

### 5.3 Calendário Editorial (`/calendario`)
- `pages/CalendarPage.tsx`:
  - `CalendarGenerator` (form: título, objetivo, data início, semanas, posts/semana, tipos) + botão **✦ Gerar com IA** (fallback se IA off, usando `useAI().status`).
  - Lista de calendários existentes; ao abrir um, `CalendarBoard` agrupa itens por semana, mostra data/hook/pilar/tipo/formato/conexão, badge de **mix vs. alvo**, e botão **Enviar para o pipeline** por item (desabilita/etiqueta "no pipeline" quando `cardId` já setado).
- Hooks: `useCalendars`, `useCalendar(id)`, `useGenerateCalendar`, `useSendCalendarItem`.
- Labels reusam `labels.ts` (pilar/tipo/formato) e `PILLAR_GROUP_MAP`/`MIX_TARGETS` p/ o indicador de mix.

## 6. Não-objetivos / invariantes
- `PipelineService.canTransition` e os 18 estágios **inalterados**.
- Validação por IA continua exigindo humano no gate (não afetado aqui).
- Sem upload/RAG; sem publicação automática.

## 7. Plano de implementação
1. Shared (schemas/tipos).
2. Prisma (modelos + migration aditiva).
3. Backend (services + rotas + permissão + seed).
4. Frontend (rotas, páginas, hooks, navegação).
5. `pnpm -r typecheck` + `vite build`; rebuild `dist` do shared. Atualizar `story.md`.

## 8. Testes mínimos
- `buildCompanyContext` omite campos vazios e retorna `''` quando perfil vazio.
- Distribuição de datas: N itens caem dentro de `[startDate, startDate + weeks*7)` e respeitam `postsPerWeek`.
- `sendItemToPipeline` é idempotente (2ª chamada não cria card novo).
