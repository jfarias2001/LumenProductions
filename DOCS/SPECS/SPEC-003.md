# SPEC-003 — Copiloto Conversacional por Fase (implementação)

> Especificação técnica do PRD-003. Reaproveita a base do SPEC-001/002 (modelo de dados, pipeline, RBAC, provider OpenAI). Adiciona: **conversas por fase**, **templates de prompt**, **consolidação conversa→entidades**, **tipo de conteúdo** e **pacote final por tipo**.

---

## 1. Modelo de dados (Prisma + shared)

### 1.1 Novo enum `ContentType`
```prisma
enum ContentType {
  VIDEO
  ESTATICO
}
```
- Espelhar em `packages/shared/src/enums.ts` (`enum ContentType`) + rótulos pt-BR em `apps/web/src/lib/labels.ts`.
- `Card`: novo campo `contentType ContentType @default(VIDEO)`. Default VÍDEO (formato dominante do produto). Definido na criação (`CreateCardModal`) e ajustável na estruturação.

### 1.2 `AIConversation` — uma thread por (card, etapa)
```prisma
model AIConversation {
  id        String      @id @default(cuid())
  cardId    String
  card      Card        @relation(fields: [cardId], references: [id], onDelete: Cascade)
  stage     Stage
  messages  AIMessage[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@unique([cardId, stage])
  @@index([cardId])
}
```

### 1.3 `AIMessage`
```prisma
model AIMessage {
  id             String         @id @default(cuid())
  conversationId String
  conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String         // 'user' | 'assistant'  (system não é persistido; é montado a cada chamada)
  content        String
  authorId       String?        // user que enviou (quando role='user')
  aiJobId        String?        // liga a resposta ao AIJob (observabilidade/tokens)
  createdAt      DateTime       @default(now())

  @@index([conversationId])
}
```

### 1.4 `PromptTemplate` — prompts padrão por fase
```prisma
model PromptTemplate {
  id        String   @id @default(cuid())
  stage     Stage
  title     String
  body      String
  isDefault Boolean  @default(false) // sugestão destacada/auto-preenchida da fase
  order     Int      @default(0)
  builtIn   Boolean  @default(false) // veio do seed; não some em reset
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stage])
}
```

### 1.5 Extensões para o entregável final
Reusamos as entidades existentes (`Script`, `Hook`, `CopyContent`, `CreativeDirection`, `DerivedAsset`). Acrescentamos campos para o que falta:

`CreativeDirection` (hoje: `format`, `visualNotes`, `referenceUrls`) ganha:
```prisma
  editingInsights String[] @default([]) // VÍDEO: cortes, ritmo, b-roll, legendas, trilha
  graphicElements Json?                  // ESTÁTICO: [{ slide, headline, body, visual }]
  palette         String?                // ESTÁTICO: paleta/estilo sugerido
```
> O "Pacote final" é **montado em runtime** a partir dessas entidades; não há tabela `Deliverable` própria.

### 1.6 Migração
- `prisma migrate dev --name conversational_copilot` (novo enum, 3 modelos, campos em Card/CreativeDirection). Compatível com a baseline existente.

---

## 2. Backend — camada de IA conversacional

### 2.1 Provider: novo método de chat livre — `apps/api/src/lib/ai/provider.ts`
Acrescentar à interface `AIProvider` (sem quebrar `generateStructured`):
```ts
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface AIProvider {
  readonly enabled: boolean;
  generateStructured<T>(args: GenerateStructuredArgs<T>): Promise<{ data: T; usage: TokenUsage; model: string }>;
  // NOVO — chat em texto livre, com streaming opcional
  chat(args: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    onToken?: (delta: string) => void; // se presente → stream:true e chama por chunk
  }): Promise<{ text: string; usage: TokenUsage; model: string }>;
}
```
- `OpenAIProvider.chat`: usa `client.chat.completions.create({ stream: !!onToken })`. Quando há `onToken`, itera o stream acumulando `delta.content` e emite cada pedaço; ao final soma `usage` (com `stream_options: { include_usage: true }`). Sem `onToken`, chamada normal.
- Sem chave → lança `AINotConfiguredError` (igual ao resto).

### 2.2 `ConversationService` — `apps/api/src/services/conversation.service.ts`
Responsável por montar contexto e orquestrar o chat.

- `getOrCreate(cardId, stage)` → retorna a conversa (cria vazia se não existe).
- `buildSystemPrompt(card, stage)`:
  1. Regra de Ouro (do `AppSetting`, como hoje).
  2. **Objetivo da fase** (mapa `STAGE_GOAL[stage]` — ex.: ROTEIRO → "Seu papel é escrever/refinar um roteiro de Reel de 30–45s seguindo dor→quebra→mecanismo→benefício→CTA").
  3. **Contexto do card**: título, persona, dor, promessa, pilar, awareness, `contentType` (adapta o tom: VÍDEO foca roteiro/edição; ESTÁTICO foca copy/slides).
  4. **Entregáveis já consolidados** das fases anteriores (resumo curto: ângulos/hooks escolhidos, roteiro, copy) — tratados como **dado** (delimitados), mantendo a defesa anti prompt-injection do `dataBlock`.
- `sendMessage({ cardId, stage, content, userId, onToken? })`:
  1. `getOrCreate`; persiste `AIMessage` role=user.
  2. Monta `[system, ...históricoDaFase, novaMensagem]` e cria `AIJob` (`type='chat:<stage>'`, status=running).
  3. Chama `provider.chat` (com `onToken` quando streaming).
  4. Persiste `AIMessage` role=assistant (com `aiJobId`); atualiza `AIJob` (succeeded, tokens, custo) ou (failed, error).
  - Texto do usuário entra como conteúdo de mensagem; o histórico nunca é interpretado como instrução de sistema.

### 2.3 Consolidação conversa → entidades — estender `ai.service.ts`
As 6 funções do §9.3 já existem. Adicionar um parâmetro opcional `conversation?: string` (transcrição da fase) injetado como `dataBlock('Conversa da fase', ...)` no `user` prompt, e expor uma função única:
```ts
consolidateStage(cardId, stage, userId): Promise<{ entity: string; data: unknown }>
```
que mapeia `stage → função estruturada` reusando a conversa como fonte:
| Stage | Função reusada | Persiste em |
|---|---|---|
| IDEIAS_BRUTAS | `structure` | campos do Card (title/persona/pain/promise/pillar/awareness) |
| IDEIAS_VALIDADAS | `validate` | `Validation` (`aiSuggested=true`, sem `reviewedById`) |
| ANGULO_DEFINIDO / HOOKS_EM_TESTE | `angles` | `Angle[]` + `Hook[]` (`aiGenerated=true`) |
| ROTEIRO / COPY_LEGENDA_CTA | `copy` | `Script` + `CopyContent` (`aiGenerated=true`) |
| DIRECAO_CRIATIVA | `direction` (**nova**) | `CreativeDirection` (format + editingInsights/graphicElements/palette conforme `contentType`) |
| ESCALAR_RECICLAR | `recycle` | `DerivedAsset[]` |

Nova função `direction(cardId, conversation, contentType)` + schema `AIDirectionOutputSchema` em shared:
- VÍDEO → `{ format, editingInsights: string[], visualNotes }`.
- ESTÁTICO → `{ format, graphicElements: [{ slide, headline, body, visual }], palette, visualNotes }`.

### 2.4 Montagem do pacote final — `DeliverableService`
`assemble(cardId)` lê o card + satélites e devolve um DTO conforme `contentType`:
- **VÍDEO:** `{ type:'VIDEO', script, hookEscolhido, screenTexts, editingInsights, caption, ctaVariations }`.
- **ESTÁTICO:** `{ type:'ESTATICO', caption, ctaVariations, graphicElements, palette, format }`.
- `toMarkdown(dto)` para export.

### 2.5 Rotas — `apps/api/src/routes/conversations.ts` (novo) + ajustes
Guardadas por `requirePermission('useAI')` (já existe no RBAC, SPEC-001 §12.3). Para escopo do card, validar acesso como nas rotas `/cards/:id`.

- `GET  /cards/:cardId/conversations/:stage` → conversa + mensagens (cria vazia se não existir).
- `POST /cards/:cardId/conversations/:stage/messages` `{ content }` → **SSE**: stream `data: {delta}` por token, evento final `data: {done, message}`. Persiste user+assistant. (Fallback não-stream: se `Accept: application/json`, responde a mensagem completa.)
- `POST /cards/:cardId/conversations/:stage/consolidate` → roda `consolidateStage`, persiste, emite `card.updated` via Socket.io, devolve a entidade.
- `GET  /cards/:cardId/deliverable` → `DeliverableService.assemble`.
- `GET  /cards/:cardId/deliverable.md` (ou `?format=md`) → Markdown.
- **Prompts**: `GET /prompt-templates?stage=`, `POST /prompt-templates`, `PATCH /prompt-templates/:id`, `DELETE /prompt-templates/:id` (escrita: `requireRole` gestor/admin).
- Resiliência: try/catch por chamada; falha grava `AIJob.status=failed` e responde `502 AI_FAILED` (no SSE, emite evento `error`). Card segue editável; conversa não corrompe.

### 2.6 Seed
- `STAGE_GOAL` + `PromptTemplate` `builtIn` para cada fase criativa (2–4 prompts por fase). Ex.:
  - ROTEIRO: "Escreva o roteiro completo (dor→quebra→mecanismo→benefício→CTA)"; "Encurte o roteiro mantendo a quebra"; "Gere 3 variações de CTA".
  - DIRECAO_CRIATIVA (VÍDEO): "Liste cortes e ritmo de edição"; "Sugira b-roll e textos de tela".
  - DIRECAO_CRIATIVA (ESTÁTICO): "Estruture um carrossel de 6 slides"; "Defina paleta e hierarquia".
- Idempotente (upsert por `title+stage` quando `builtIn`).

---

## 3. Frontend — workspace de produção

### 3.1 Layout do `CardDetail`
Reestruturar de "abas de formulário" para **workspace de 3 zonas**:
- **Esquerda — navegador de fases:** lista as etapas do card destacando a atual; cada uma abre sua conversa. Indica fases já consolidadas (ícone/badge).
- **Centro — chat da fase (`PhaseChat`):** histórico (bolhas user/assistant, Markdown renderizado), caixa de envio, **chips de prompts padrão** (`PromptTemplateChips`) no topo, indicador "Gerando…" durante o stream. Fallback "IA indisponível — preencha manualmente" se `code=AI_NOT_CONFIGURED`.
- **Direita — painel do entregável da fase (`StageDeliverablePanel`):** mostra a entidade consolidada (roteiro/ângulos/copy/direção), editável à mão, com botão **"Consolidar nesta fase"**.
- **Aba/zona "Pacote":** `FinalPackageView` chamando `GET /deliverable`, render por tipo + botão Copiar/Exportar `.md`.

### 3.2 Novos componentes
- `PhaseChat.tsx`, `ChatMessage.tsx`, `PromptTemplateChips.tsx`, `StageDeliverablePanel.tsx`, `FinalPackageView.tsx`, `PhaseNavigator.tsx`.
- Settings: `PromptTemplatesSettings.tsx` (CRUD + reordenar + marcar padrão).

### 3.3 Hooks / dados
- `hooks/useConversation.ts`: `useConversation(cardId, stage)` (GET) + `useSendMessage` consumindo **SSE** (fetch + `ReadableStream`/`EventSource`-like) atualizando a última bolha em tempo real; `useConsolidateStage`.
- `hooks/usePromptTemplates.ts`: list/create/update/delete por stage.
- `hooks/useDeliverable.ts`: assemble + export.
- `useAI.ts` atual permanece (status da IA + funções one-shot continuam disponíveis como atalho), mas a interface principal passa a ser o chat.

### 3.4 Criação do card
- `CreateCardModal`: adicionar seletor **Tipo de conteúdo** (VÍDEO/ESTÁTICO).

---

## 4. Segurança
- Chave OpenAI só no backend (inalterado).
- Permissão `useAI` para conversar/consolidar; escrita de prompts restrita a gestor/admin.
- Histórico de conversa e texto colado tratados como **dado** (delimitados); consolidação valida saída por Zod e descarta fora do schema.

## 5. Compatibilidade
- Pipeline, gates (`PipelineService.canTransition`) e entidades existentes **inalterados**. Validação por IA continua sugestão (humano no gate).
- Botões one-shot do PRD-002 seguem funcionando (atalho), agora além do chat.

## 6. Não implementado nesta SPEC
- Fila BullMQ assíncrona (chat é síncrono/streaming).
- Geração de imagens/arte renderizada (elementos gráficos são descrição textual/estrutura).
- Múltiplas threads por fase (uma por `cardId+stage`).
- Transcrição/OCR automático de anexos.
