# SPEC-016 — Desfazer geração da IA + edição manual livre

Referência: PRD-016. Continuação do estado descrito em `DOCS/STORY/story.md` (até PRD-015).

## 1. Modelo de dados (Prisma)

Novo modelo `CardSnapshot` — pilha de pontos de restauração por card.

```prisma
model CardSnapshot {
  id          String   @id @default(cuid())
  cardId      String
  card        Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label       String   // legível: "Gerar com IA — Roteiro"
  stage       Stage    // etapa do card no momento do snapshot
  data        Json     // subárvore serializada (ver §2)
  createdById String?
  createdAt   DateTime @default(now())

  @@index([cardId, createdAt])
}
```

`Card` ganha a relação inversa `snapshots CardSnapshot[]`.

**Migration** `20260720000000_card_snapshots` — aditiva e idempotente (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, FK via bloco `DO $$ … EXCEPTION WHEN duplicate_object`). Aplicada no boot por `prisma migrate deploy` (CMD do container).

## 2. Serialização do snapshot (`data`)

Só o que a geração da IA pode sobrescrever:

```jsonc
{
  "card": { "title", "persona", "pain", "promise", "pillar", "awareness", "screenTexts", "isAd", "adPlan" },
  "validation": { … } | null,
  "angles":  [{ "type", "text", "selected", "aiGenerated" }],
  "hooks":   [{ "text", "status", "aiGenerated" }],
  "script":  { … } | null,
  "creative":{ … } | null,
  "copy":    { … } | null,
  "derivedAssets": [{ "type", "content", "externalUrl", "aiGenerated" }]
}
```

Entidades `1:1` (validation/script/creative/copy): objeto ou `null`. Coleções (angles/hooks/derivedAssets): arrays (podem ser vazios). Campos `id/cardId/createdAt/updatedAt` **não** entram — a restauração recria as linhas.

## 3. `snapshot.service.ts`

- `SNAPSHOT_INCLUDE` = `{ validation, angles, hooks, script, creative, copy, derivedAssets }`.
- `MAX_SNAPSHOTS = 20` por card (poda os mais antigos).
- **`captureSnapshot(cardId, label, userId?)`** — lê a subárvore, serializa (§2), cria `CardSnapshot`, poda o excedente (`skip: MAX_SNAPSHOTS`). Retorna a linha criada (ou `null` se o card não existe).
- **`withSnapshot(cardId, label, userId, fn)`** — captura → executa `fn()` → em caso de erro **apaga o snapshot recém-criado** (evita fantasma quando a IA falha) e repropaga. Retorna o resultado de `fn`.
- **`listSnapshots(cardId)`** — `{ id, label, stage, createdAt }[]` desc.
- **`restoreLatest(cardId)`** — pega o topo da pilha; sem snapshot → lança `{ code: 'NO_SNAPSHOT' }`. Em `prisma.$transaction`:
  - `card.update` com os 9 campos escalares do snapshot;
  - `validation/script/creative/copy`: `upsert` se presente, senão `deleteMany({ where: { cardId } })`;
  - `angles/hooks/derivedAssets`: `deleteMany` + `createMany` a partir do snapshot;
  - `cardSnapshot.delete` do topo (pop).
  - Retorna `{ cardId, remaining }`.

## 4. Integração da captura (pontos de escrita da IA)

Envolver com `withSnapshot` **antes** de qualquer persistência:

| Fluxo | Onde | Label |
|---|---|---|
| Gerar com IA | `ai.service.generateStage` (envolve `persistStageFromSource`) | `Gerar com IA — {STAGE_LABEL}` |
| Consolidar conversa | `ai.service.consolidateStage` | `Consolidar — {STAGE_LABEL}` |
| `/ai/structure` (só com `cardId`) | rota | `Estruturar ideia` |
| `/ai/validate` | rota | `Validar (auto-correção)` |
| `/ai/angles` | rota | `Gerar ângulos & hooks` |
| `/ai/copy` | rota | `Gerar roteiro + copy` |
| `/ai/direction` | rota | `Gerar direção criativa` |
| `/ai/ad-creative` | rota | `Gerar criativo de anúncio` |
| `/ai/recycle` | rota | `Gerar ativos derivados` |

`autoProduceCard`/`autoProduceCalendar` **não** capturam (cards recém-criados a partir do calendário; desfazer não se aplica).

## 5. Rotas (backend)

- **`POST /cards/:id/undo`** (`viewBoard`) → `restoreLatest`; emite `card.updated`; devolve `{ cardId, remaining }`. Sem snapshot → `409 { code: NO_SNAPSHOT }`.
- **`GET /cards/:id`** — inclui `snapshots: { select: { id, label, stage, createdAt }, orderBy: { createdAt: 'desc' } }` para a UI saber a contagem e o rótulo do topo sem request extra.

## 6. Frontend

### 6.1 Hook
`useUndoGeneration(cardId)` (em `useBoard.ts`) — `POST /cards/:id/undo`; invalida `['card', cardId]`, `['board']`, `['deliverable', cardId]`.

### 6.2 Desfazer (destacado)
- **`UndoBar`** (novo, em `CardDetail`) — renderizado logo abaixo do stepper no modo Fluxo **sempre que `card.snapshots.length > 0`**. Estilo de destaque (acento `ai`/âmbar): texto "A IA alterou este card" + botão **↩ Desfazer última geração** com contagem e rótulo/‌hora do topo. Erros inline.
- **`StageGenerator`** — no painel verde de sucesso, botão imediato **↩ Desfazer esta geração** (mesma mutation), para desfazer na hora.

### 6.3 Edição manual
- **Título no cabeçalho** — `EditableTitle`: clique no `h2` vira input; Enter/blur salva via `updateCard.mutate({ title })`; Esc cancela. Substitui o `<h2>` estático.
- **`FundamentalsEditor`** (novo) — seção recolhível "▸ Editar fundamentos da ideia" com persona/dor/promessa/pilar/consciência (mesmo padrão de campos do `TemplateTab`), salva via `PATCH /cards/:id`. Renderizada no corpo do Fluxo em **todas as etapas exceto** `SINAIS_MERCADO` e `IDEIAS_BRUTAS` (que já expõem esses campos no `TemplateTab`).

## 7. Não-objetivos / invariantes

- `PipelineService.canTransition` e todos os gates **inalterados**.
- Sem mudança em `packages/shared` (nenhum enum/schema novo — `snapshots` é campo de leitura no payload do card).
- Chaves de IA seguem só no backend; publicação manual; métricas manuais.
- Restauração transacional; poda em 20 snapshots/card evita crescimento ilimitado.

## 8. Verificação

- `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `prisma generate`.
- Deploy: rebuild dos containers; a migration roda no boot (`prisma migrate deploy`).
- Fumaça: gerar em Ideias Validadas → título muda → **Desfazer** volta o título; gerar 2× → desfazer 2×; falha de IA não deixa snapshot; editar título no header e fundamentos em etapa avançada.
