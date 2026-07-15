# SPEC-015 — Diretrizes de Marketing LumenCRM na geração de conteúdo

**PRD:** PRD-015 · **Data:** 2026-07-15

## 1. `packages/shared`

### 1.1 `constants.ts`

**Reescrever `GOLDEN_RULE_PROMPT`** (posicionamento central, injetado por `goldenRule()` em TODAS as gerações). Novo conteúdo, mantendo as guardas de JSON/anti-injection:
- Persona: dono de agência de marketing/tráfego em mercado saturado (tráfego virou commodity ~R$300/conta, CAC subiu, cliente gera lead mas não vende e cancela → LTV baixo/churn alto).
- Produto real: **processo comercial completo com IA** (IA que atende e agenda no WhatsApp + CRM que move o lead sozinho + follow-up automatizado + disparos + ligação com IA + e-mail), **white label, com a marca da agência**.
- Porta de entrada: **IA de atendimento white label** (o hype). CRM = **sustentação**, nunca gancho.
- Lógica econômica (R$1.500 tráfego → R$1.000+/mês processo comercial; mexe no faturamento do cliente → LTV maior/churn menor/recorrência).
- Sequência da Regra de Ouro: dor → falha do processo → mecanismo (vender o processo comercial com IA white label) → posicionamento da LumenCRM. Autoridade por prova, nunca por preço.

**Adicionar `BRAND_VOICE_GUIDE`** (tom de voz §9 + o que NÃO falar §8 + vocabulário usa/evita). Injetado nas gerações que **escrevem texto para o público**.

**Adicionar `CREATIVE_STRUCTURE_GUIDE`** (estrutura padrão gancho 0–3s → desenvolvimento → prova → CTA + o que mais performa: tela do sistema, criativo de resultado/faturamento, vídeo falado dinâmico). Injetado nas gerações de **roteiro/direção/anúncio**.

> Rebuild do `dist` do shared após editar `constants.ts`.

## 2. Backend (`apps/api`)

### 2.1 `src/prisma/company-knowledge.ts` — enriquecer `LUMEN_COMPANY_PROFILE`

Reescrever os campos a partir do documento (respeitando os limites do `CompanyProfileSchema`: `about`/`offerings`/`mainPains`/`differentiators`/`proofCases` ≤ 4000; `toneOfVoice` ≤ 2000; `companyName` ≤ 200):
- `companyName`: `LumenCRM`.
- `about`: plataforma white label completa; **saída** para o dono de agência (novo produto = processo comercial com IA); porta de entrada = IA de atendimento; CRM = sustentação.
- `offerings`: o processo comercial completo (itens do funil) + **as 4 mensagens centrais (pilares)** + a lógica econômica + Instagram como canal.
- `personas`: ICP **primário** (dono de agência de marketing/tráfego), **secundário** (gestor de tráfego solo), **terciário** (mentores/educadores com alunos — perfil Everton) e **anti-persona** (empresário final, curiosos de IA, quem quer chatbot barato).
- `mainPains`: mapa de dores (negócio → operacionais → emocionais) + desejos.
- `toneOfVoice`: os 6 atributos do §9 (direto/concreto, de dono para dono, conversacional, provocador na dor, autoridade por prova, copy à mão anti-IA).
- `differentiators`: funil inteiro vs. GPT solto; a tela vende; recursos que a concorrência não tem.
- `proofCases`: provas do documento (fechamento via follow-up/movimentação automática; lead que a IA agendou às 20h; ~R$10k/mês de recorrência do mentor) + base (+300 parceiros, +8k usuários, +R$400k/mês) — sempre com **ressalva honesta** (potencial, não promessa).
- `dos` / `donts`: derivados do §7/§8/§9.
- `keywords`: vocabulário que usamos (processo comercial com IA, IA de atendimento, white label, com a sua marca, LTV, recorrência, follow-up automatizado, lead agendado sozinho, mexer no faturamento do seu cliente, funil inteiro no lugar…).

### 2.2 `src/services/ai.service.ts` — matriz de injeção

Importar `BRAND_VOICE_GUIDE` e `CREATIVE_STRUCTURE_GUIDE`. Anexar ao `system` de cada função conforme a matriz (o `goldenRule()` — posicionamento + base da empresa — já entra em todas):

| Função | HOOKS_GUIDE | BRAND_VOICE_GUIDE | CREATIVE_STRUCTURE_GUIDE | INSTAGRAM | META_ADS |
|---|:-:|:-:|:-:|:-:|:-:|
| `prospect` | | ✅ | | | |
| `structure` | | ✅ | | | |
| `validate` | | | | | |
| `improveIdea` | | ✅ | | | |
| `angles` | ✅ (já) | ✅ | | | |
| `copy` | | ✅ | ✅ | ✅ (já) | |
| `direction` | | ✅ | ✅ | ✅ (já) | |
| `adCreative` | ✅ (já) | ✅ | ✅ | ✅ (já) | ✅ (já) |
| `recycle` | | ✅ | | | |
| `generateCalendar` | ✅ (já) | ✅ | | ✅ (já) | |

- `validate` fica enxuta (só pontua — não escreve texto para o público).
- No user prompt de `copy`, deixar explícito que o roteiro (dor/quebra/mecanismo/beneficio/cta) **é** a estrutura gancho → desenvolvimento → prova → CTA e que a prova deve mostrar a **tela do sistema**/número.

### 2.3 `src/prisma/seed-knowledge.ts` e `seed.ts`

- **Sem alteração de código** — ambos já importam `GOLDEN_RULE_PROMPT` e `LUMEN_COMPANY_PROFILE` e propagam por upsert. Rodar `pnpm --filter api db:seed:knowledge` aplica as versões novas no banco existente.

### 2.4 Sem mudança

- `provider.ts`, rotas, `pipeline.service.ts`, `calendar.service.ts`, schema Prisma, migrations — inalterados.

## 3. Frontend (`apps/web`)

- Nenhuma mudança de código. A tela `/empresa` (`CompanyProfilePage`) já é dinâmica e passa a exibir o perfil enriquecido, editável por ADMIN/GESTOR.

## 4. Validação

- `pnpm --filter @content-engine/shared build`.
- `pnpm --filter api typecheck` e `pnpm --filter web typecheck`.
- Sem migração. Deploy: rebuild dos containers + **rodar `db:seed:knowledge`** para as gerações passarem a usar as Diretrizes (a Regra de Ouro em uso vem do `AppSetting`, não da constante).
