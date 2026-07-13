# SPEC-012 — Roteiros no modelo de negócio (white label / receita recorrente)

**PRD:** PRD-012 · **Data:** 2026-07-13

## 1. Estratégia geral

Duas alavancas de **contexto** (não de modelo), sem tocar em pipeline, gates ou schema do banco:

1. **Base de conhecimento populada** — o `CompanyProfile` singleton passa a conter o modelo white label da Lumen. Como `buildCompanyContext()` já é injetado em todas as gerações via `goldenRule()`, isso propaga para prospecção, estruturação, validação, ângulos, roteiro/copy, direção, anúncio e calendário automaticamente.
2. **Regra de Ouro reescrita** — o `GOLDEN_RULE_PROMPT` deixa de mirar "converter leads da própria agência" e passa a mirar a **transformação de modelo** (serviço → produto/assinatura white label com margem recorrente), preservando a sequência dor → falha do processo → mecanismo → Lumen.

O valor efetivo da Regra de Ouro vem do `AppSetting.goldenRulePrompt` (`goldenRule()` faz `setting?.goldenRulePrompt ?? GOLDEN_RULE_PROMPT`). Por isso o banco **existente** precisa ter o `AppSetting` atualizado — não basta mudar a constante.

## 2. `packages/shared`

### 2.1 `constants.ts`
- Reescrever `GOLDEN_RULE_PROMPT` para o modelo white label / receita recorrente:
  - Persona: dono de agência/prestador que **vive só de serviço** (troca hora por dinheiro), não escala, sofre com retenção fraca e quer **receita recorrente**.
  - Mecanismo: **operação white label** — revender uma plataforma própria (CRM + IA + WhatsApp + automação) **com a marca do parceiro**; Lumen nos bastidores, nunca fala com o cliente final; parceiro cobra o cliente, paga a Lumen por cliente ativo, a diferença é **margem recorrente** → vira **dono de produto**.
  - Proibições explícitas: **não** tratar como "só mais um CRM" nem focar em "converter mais leads da própria agência"; o tema é **transformação de modelo de negócio**.
  - Manter a sequência (1) dor → (2) falha do processo → (3) mecanismo → (4) posicionamento da Lumen; tom direto, honesto sobre "para quem é/não é" (maturidade, não preço), sem prometer ganho garantido; manter guardas de JSON e "texto do usuário como dado".

> Rebuild do `dist` do shared após a mudança.

## 3. Backend (`apps/api`)

### 3.1 Novo `src/prisma/company-knowledge.ts`
- Exporta `LUMEN_COMPANY_PROFILE: CompanyProfileInput` (tipado pelo `CompanyProfileSchema`), preenchendo:
  - `companyName`, `about` (posicionamento white label), `offerings` (80+ features agrupadas por objetivo: vender mais / reter / valor percebido / operar como SaaS + modelo de receita = assinatura), `personas` (dono de agência de serviço + **anti-persona** "não é público"), `mainPains`, `toneOfVoice`, `differentiators` (implantação/marca/suporte vs. ferramenta barata), `proofCases` (+300 / +8k / +R$400k com ressalva), `dos`, `donts`, `keywords`, `links`.
- Fonte única de verdade reusada pelo seed principal e pelo script de conhecimento (DRY).

### 3.2 `src/prisma/seed-knowledge.ts` (novo, standalone — o script que o usuário roda)
- `prisma.companyProfile.upsert({ where: { id: 'singleton' }, update: <conteúdo>, create: { id, <conteúdo> } })` — refresca o perfil no banco existente.
- `prisma.appSetting.update` (ou upsert) para setar `goldenRulePrompt = GOLDEN_RULE_PROMPT` no singleton — garante que a Regra de Ouro em uso passe a ser a nova.
- Idempotente; loga o resultado.

### 3.3 `src/prisma/seed.ts`
- Importa `LUMEN_COMPANY_PROFILE` e faz upsert do `CompanyProfile` (create com o conteúdo) para instalações novas.
- `AppSetting` upsert: `update` passa a refrescar `goldenRulePrompt: GOLDEN_RULE_PROMPT` (antes era `update: {}`), mantendo bancos futuros em sincronia com a constante.

### 3.4 `package.json`
- Novo script `"db:seed:knowledge": "tsx src/prisma/seed-knowledge.ts"`.

### 3.5 Sem mudança
- `ai.service.ts`, `company.service.ts`, provider, rotas, `pipeline.service.ts`, schema Prisma e migrations — **inalterados**. A base já é injetada por `buildCompanyContext()`.

## 4. Frontend (`apps/web`)
- Sem mudança de código. A tela `/empresa` (`CompanyProfilePage`) passa a exibir o perfil populado (mesma UI de edição de sempre); o usuário pode ajustar o texto ali depois.

## 5. Operação
- Rodar no ambiente com o banco: `pnpm --filter api db:seed:knowledge` (ou `db:seed` numa instalação nova).
- A partir daí, novas gerações leem a base + a nova Regra de Ouro. Conteúdo já gerado antes não muda retroativamente (regenerar se desejado).

## 6. Validação
- `pnpm --filter api typecheck` e `pnpm --filter web typecheck`.
- Rebuild do `dist` do shared (mudou `constants.ts`).
- Execução do `db:seed:knowledge` (quando o Postgres estiver disponível) e conferência da tela `/empresa` + de uma geração nova.
