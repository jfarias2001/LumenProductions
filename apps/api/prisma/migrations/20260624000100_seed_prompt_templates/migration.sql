-- Seed idempotente dos prompt templates padrão por fase (PRD-003 §5.2).
-- Roda no `prisma migrate deploy` (boot do container) — não depende do `db:seed`,
-- que precisa do código-fonte ausente na imagem de runtime.
-- IDs fixos + ON CONFLICT DO NOTHING garantem que rodar de novo não duplica.

INSERT INTO "PromptTemplate" ("id", "stage", "title", "body", "isDefault", "builtIn", "order", "updatedAt") VALUES
  ('pt_ideias_lapidar', 'IDEIAS_BRUTAS', 'Lapidar a ideia', 'Com base no que temos, me ajude a clarear a dor central, a persona (dono de agência) e a promessa. Sugira 3 títulos possíveis e qual pilar e nível de consciência fazem mais sentido.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_ideias_variacoes', 'IDEIAS_BRUTAS', 'Explorar variações', 'Liste 5 variações de abordagem para essa ideia, cada uma entrando por uma dor diferente do dono de agência.', false, true, 1, CURRENT_TIMESTAMP),
  ('pt_validar_potencial', 'IDEIAS_VALIDADAS', 'Avaliar potencial', 'Avalie criticamente essa ideia em dor quente, clareza, contraste, especificidade de agência, potencial de comentários e potencial comercial (nota 0–3 cada). Aponte a maior fraqueza e como corrigir.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_angulos_gerar', 'ANGULO_DEFINIDO', 'Gerar ângulos', 'Proponha de 3 a 5 ângulos narrativos (dor, culpa transferida, oportunidade, medo, autoridade) para essa ideia e recomende o mais forte para a persona, justificando.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_hooks_gerar', 'HOOKS_EM_TESTE', 'Gerar hooks', 'Escreva 10 hooks de abertura (primeiros 2 segundos) que parem o scroll e entrem direto na dor. Varie estilo: pergunta, afirmação polêmica, número, cenário.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_hooks_refinar', 'HOOKS_EM_TESTE', 'Refinar hook', 'Pegue o melhor hook e gere 5 variações mais curtas e mais agressivas, mantendo a clareza.', false, true, 1, CURRENT_TIMESTAMP),
  ('pt_roteiro_escrever', 'ROTEIRO', 'Escrever roteiro', 'Escreva o roteiro completo de 30–45s seguindo dor → quebra de crença → mecanismo → benefício → CTA, no tom direto para dono de agência. Inclua textos de tela curtos.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_roteiro_encurtar', 'ROTEIRO', 'Encurtar mantendo a quebra', 'Encurte o roteiro para caber em ~30s sem perder a quebra de crença. Marque o que cortar.', false, true, 1, CURRENT_TIMESTAMP),
  ('pt_direcao_video', 'DIRECAO_CRIATIVA', 'Direção de vídeo', 'Liste a direção de edição: cortes, ritmo, b-roll, textos de tela e sugestão de trilha. Indique o formato mais adequado.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_direcao_carrossel', 'DIRECAO_CRIATIVA', 'Estrutura de carrossel', 'Estruture um carrossel: defina o conteúdo de cada slide (título, texto e elemento visual), a paleta e a hierarquia visual.', false, true, 1, CURRENT_TIMESTAMP),
  ('pt_copy_legenda', 'COPY_LEGENDA_CTA', 'Escrever legenda + CTAs', 'Escreva a legenda para a peça (gancho na primeira linha, corpo e fechamento) e 3 variações de CTA, mantendo a Regra de Ouro.', true, true, 0, CURRENT_TIMESTAMP),
  ('pt_reciclar_derivados', 'ESCALAR_RECICLAR', 'Gerar derivados', 'Transforme essa peça vencedora em ativos derivados (carrossel, e-mail, script de SDR, post de LinkedIn, novos hooks). Adapte a mensagem a cada canal.', true, true, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
