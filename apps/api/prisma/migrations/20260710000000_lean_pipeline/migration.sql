-- Pipeline enxuto (PRD-011 / SPEC-011). Reduz o pipeline ativo de 18 → 9 etapas.
-- Os valores de enum Stage são MANTIDOS (compat com dados legados e com o arquivamento);
-- apenas o default do card muda e os cards presos em etapas removidas são realocados.
-- Aditiva e idempotente.

-- 1. Novo estágio inicial (Sinais do Mercado deixou de existir no fluxo).
ALTER TABLE "Card" ALTER COLUMN "stage" SET DEFAULT 'IDEIAS_BRUTAS';

-- 2. Realoca cards presos em etapas removidas para a etapa ativa mais próxima.
--    ARQUIVADO NÃO é tocado (segue como estado terminal de arquivamento).
UPDATE "Card" SET "stage" = 'IDEIAS_BRUTAS'    WHERE "stage" = 'SINAIS_MERCADO';
UPDATE "Card" SET "stage" = 'ROTEIRO'          WHERE "stage" = 'DIRECAO_CRIATIVA';
UPDATE "Card" SET "stage" = 'REVISAO_RETENCAO' WHERE "stage" = 'COPY_LEGENDA_CTA';
UPDATE "Card" SET "stage" = 'EM_EDICAO'         WHERE "stage" = 'GRAVADO';
UPDATE "Card" SET "stage" = 'PUBLICADO'        WHERE "stage" IN ('AGENDADO', 'EM_DISTRIBUICAO', 'ANALISE', 'ESCALAR_RECICLAR');
