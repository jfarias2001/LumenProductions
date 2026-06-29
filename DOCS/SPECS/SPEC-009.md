# SPEC-009 — Vídeos de anúncio no calendário + criativo Meta Ads

Tradução técnica do PRD-009. Aditivo: nenhum enum, gate ou contrato existente é
removido; o pipeline de 18 estágios e o `PipelineService` permanecem intactos.

## 1. `packages/shared`

### 1.1 Schemas (`schemas.ts`)
- **`BooleanLoose`** — preprocessador tolerante (a IA pode devolver `"true"`, `"sim"`, `1`): mapeia para `boolean`, default `false`.
- **`GenerateCalendarInputSchema`** — novo campo `adVideoCount: number().int().min(0).max(60).default(0)`; os refines de total (≥1, ≤60) passam a somar `videoCount + postCount + carrosselCount + adVideoCount`.
- **`AICalendarItemSchema`** — novo campo `isAd: BooleanLoose` (default `false`).
- **`CreateCardSchema` / `UpdateCardSchema`** — novo campo opcional `isAd: boolean`.
- **`AIAdCreativeOutputSchema`** (novo) — saída do criativo de anúncio:
  - `script: { dor, quebra, mecanismo, beneficio, cta, durationSec(15–90, default 30) }` — roteiro do anúncio (foco conversão).
  - `primaryText` (texto principal), `headline`, `description`, `ctaButton` (default "Saiba mais"), `copyVariations[]`.
  - `format` (FormatLoose), `hook` (gancho 3s), `shotList: Shot[]`, `systemAssets[]` (vídeos do sistema/banco/b-roll), `music`, `soundEffects[]`, `voiceTone`, `editingInsights[]`, `conversionTips[]`.
  - Campos de texto usam `LooseString`/`looseArray(LooseString)` (tolerante a objeto/array da IA).
- **`AIAdCreativeInputSchema`** = `{ cardId: cuid }`. Tipos inferidos exportados.

### 1.2 Build
`pnpm --filter @content-engine/shared build` (regenera `dist`).

## 2. Prisma (`apps/api`)
Migration aditiva `20260629000000_ad_creative`:
- `Card.isAd Boolean @default(false)`, `Card.adPlan Json?` (guarda o `AIAdCreativeOutput` completo p/ render rico).
- `EditorialCalendarItem.isAd Boolean @default(false)`.
- `EditorialCalendar.adVideoCount Int?`.

## 3. Backend — `ai.service.ts`
- **`META_ADS_CONTEXT`** — constante de contexto (Reels/feed Ads no Meta; tráfego frio; resposta direta).
- **`adCreative(cardId, userId)`** → `AIAdCreativeOutput`. System prompt = Regra de Ouro + Base da empresa + `INSTAGRAM_CONTEXT` + `META_ADS_CONTEXT`, papel "diretor de criativos de performance / copywriter de resposta direta". Lê título/persona/dor/promessa/ângulo selecionado/hooks escolhidos. Registra `AIJob` (`type: 'ad_creative'`).
- **`persistAdCreative(cardId, out)`** — preenche as entidades para os gates passarem:
  - `Script` ← `out.script`.
  - `CopyContent` ← `caption = out.primaryText`, `ctaVariations = out.copyVariations.length ? out.copyVariations : [out.ctaButton]`.
  - `CreativeDirection` ← `format = out.format ?? PESSOA_FALANDO`, `editingInsights = out.editingInsights`, `productionPlan = { voiceTone, shotList }`.
  - `Card.adPlan = out` (objeto completo).
- **`autoProduceCard`** — lê `card.isAd`; mantém validação + ângulos/hooks; no passo criativo, **se `isAd`** chama `adCreative` + `persistAdCreative`; senão, `copy` + `direction` (comportamento atual).
- **`persistStageFromSource`** — nos estágios `ROTEIRO`/`COPY_LEGENDA_CTA`/`DIRECAO_CRIATIVA`, se `card.isAd`, roteia para `adCreative` + `persistAdCreative` (gera/atualiza o criativo de anúncio).
- **`generateCalendar`** — `total` inclui `adVideoCount`; o prompt pede `adVideoCount` itens de VÍDEO com `isAd:true`, focados em conversão Meta Ads; JSON de item ganha `"isAd"`.

## 4. Backend — `calendar.service.ts`
- `planDates`/`generateAndSave` propagam `isAd` por item; gravam `EditorialCalendar.adVideoCount`.
- `sendItemToPipeline` e `autoProduceCalendar` setam `card.isAd = item.isAd` ao criar o card.
- Novo **`setItemAd(calendarId, itemId, isAd)`** — atualiza `EditorialCalendarItem.isAd`.

## 5. Backend — rotas
- `routes/calendar.ts`: novo `PATCH /calendars/:id/items/:itemId` (body `{ isAd: boolean }`, permissão `createCard`) → `setItemAd`.
- `routes/ai.ts`: novo `POST /ai/ad-creative` (body `AIAdCreativeInputSchema`) → `adCreative` + `persistAdCreative`; 503 sem chave / 502 em falha; emite `card.updated`.

## 6. Backend — `deliverable.service.ts`
- `assemble`: lê `card.isAd` + `card.adPlan`. Quando `isAd`, o deliverable (VÍDEO) ganha `isAd: true` e `ad: AdCreativePlan` (texto principal, headline, descrição, botão, gancho, vídeos do sistema, trilha, efeitos, tom de voz, dicas de conversão).
- `toMarkdown`: quando há `ad`, prepende seção "## 📣 Criativo de anúncio (Meta Ads)".

## 7. Frontend (`apps/web`)
- `lib/labels.ts`: nada novo obrigatório (badge inline).
- `useCalendar.ts`: `CalendarItem.isAd`, `CalendarDetail/Summary.adVideoCount`, `GenerateCalendarInput.adVideoCount`, novo `useSetItemAd(calendarId)`.
- `CalendarPage.tsx`: 4º campo "Vídeos de anúncio"; total inclui o bucket; `ItemCard` mostra badge "📣 Anúncio" e um toggle marcar/desmarcar.
- `useDeliverable.ts`: `VIDEO` ganha `isAd?` e `ad?: AdCreativePlan`.
- `FinalPackageView.tsx`: quando `data.ad`, renderiza bloco "📣 Criativo de anúncio (Meta Ads)" no topo.

## 8. Não-objetivos
- Sem integração com a API do Meta/Facebook Ads (nenhum upload/publicação automática).
- Sem biblioteca real de "vídeos do sistema" — a IA **sugere** assets; o acervo fica fora do escopo da v1.
- Anúncio é sempre **VÍDEO** na v1 (bucket do gerador); marcar um estático como anúncio é possível pelo toggle, mas o criativo de anúncio é otimizado para vídeo.
