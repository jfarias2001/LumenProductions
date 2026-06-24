import { PrismaClient, Stage, Role } from '@prisma/client';
import argon2 from 'argon2';
import {
  GOLDEN_RULE_PROMPT,
  MIX_TARGETS,
  PILLAR_GROUP_MAP,
  WEEKLY_TARGETS,
  RETENTION_QUESTIONS,
} from '@content-engine/shared';

const prisma = new PrismaClient();

async function main() {
  // AppSetting singleton
  await prisma.appSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      mixTargets: {
        dorConsciencia: MIX_TARGETS.DOR_CONSCIENCIA,
        solucaoMecanismo: MIX_TARGETS.SOLUCAO_MECANISMO,
        provaBastidorProduto: MIX_TARGETS.PROVA_BASTIDOR_PRODUTO,
      },
      pillarGroupMap: PILLAR_GROUP_MAP,
      weeklyTargets: {
        dor: WEEKLY_TARGETS.DOR,
        autoridade: WEEKLY_TARGETS.AUTORIDADE,
        produto: WEEKLY_TARGETS.PRODUTO,
        prova: WEEKLY_TARGETS.PROVA,
        trend: WEEKLY_TARGETS.TREND,
      },
      goldenRulePrompt: GOLDEN_RULE_PROMPT,
    },
  });

  // Admin user
  const adminHash = await argon2.hash('Admin@123456');
  await prisma.user.upsert({
    where: { email: 'admin@lumendigital.com.br' },
    update: {},
    create: {
      name: 'Admin Lumen',
      email: 'admin@lumendigital.com.br',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Demo users
  const demoUsers = [
    { name: 'Gestor Demo', email: 'gestor@lumendigital.com.br', role: Role.GESTOR },
    { name: 'Estrategista Demo', email: 'estrategista@lumendigital.com.br', role: Role.ESTRATEGISTA },
    { name: 'Roteirista Demo', email: 'roteirista@lumendigital.com.br', role: Role.ROTEIRISTA },
    { name: 'Editor Demo', email: 'editor@lumendigital.com.br', role: Role.EDITOR },
    { name: 'Revisor Demo', email: 'revisor@lumendigital.com.br', role: Role.REVISOR_RETENCAO },
  ];
  const demoHash = await argon2.hash('Demo@123456');
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: demoHash },
    });
  }

  // Checklist templates (SPEC-001 §20.1)
  const templates: { stage: Stage; items: string[] }[] = [
    {
      stage: Stage.PRONTO_PARA_GRAVAR,
      items: [
        'Roteiro aprovado',
        'Abertura (hook) definida',
        'Textos de tela preparados',
        'CTA definido',
        'Local de gravação confirmado',
        'Responsável pela gravação confirmado',
        'Referências visuais separadas',
        'Duração prevista validada (30–45s)',
      ],
    },
    {
      stage: Stage.EM_EDICAO,
      items: [
        'Cortes secos (sem silêncio)',
        'Legenda dinâmica adicionada',
        'Palavras-chave destacadas na tela',
        'Mudança visual a cada 2–3 segundos',
        'Sem introdução lenta',
        'Compreensível sem áudio',
      ],
    },
    {
      stage: Stage.EM_DISTRIBUICAO,
      items: [
        'Responder comentários das primeiras 24h',
        'Fixar comentário estratégico',
        'Enviar para leads mornos via direct',
        'Repostar em stories',
        'Usar como argumento comercial no CRM',
      ],
    },
  ];

  for (const t of templates) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { stage: t.stage } });
    if (!existing) {
      await prisma.checklistTemplate.create({
        data: {
          stage: t.stage,
          items: {
            create: t.items.map((label, order) => ({ label, order })),
          },
        },
      });
    }
  }

  // Prompt templates por fase (PRD-003 §5.2) — sugestões padrão da conversa.
  const prompts: { stage: Stage; title: string; body: string; isDefault?: boolean }[] = [
    { stage: Stage.IDEIAS_BRUTAS, title: 'Lapidar a ideia', isDefault: true, body: 'Com base no que temos, me ajude a clarear a dor central, a persona (dono de agência) e a promessa. Sugira 3 títulos possíveis e qual pilar e nível de consciência fazem mais sentido.' },
    { stage: Stage.IDEIAS_BRUTAS, title: 'Explorar variações', body: 'Liste 5 variações de abordagem para essa ideia, cada uma entrando por uma dor diferente do dono de agência.' },
    { stage: Stage.IDEIAS_VALIDADAS, title: 'Avaliar potencial', isDefault: true, body: 'Avalie criticamente essa ideia em dor quente, clareza, contraste, especificidade de agência, potencial de comentários e potencial comercial (nota 0–3 cada). Aponte a maior fraqueza e como corrigir.' },
    { stage: Stage.ANGULO_DEFINIDO, title: 'Gerar ângulos', isDefault: true, body: 'Proponha de 3 a 5 ângulos narrativos (dor, culpa transferida, oportunidade, medo, autoridade) para essa ideia e recomende o mais forte para a persona, justificando.' },
    { stage: Stage.HOOKS_EM_TESTE, title: 'Gerar hooks', isDefault: true, body: 'Escreva 10 hooks de abertura (primeiros 2 segundos) que parem o scroll e entrem direto na dor. Varie estilo: pergunta, afirmação polêmica, número, cenário.' },
    { stage: Stage.HOOKS_EM_TESTE, title: 'Refinar hook', body: 'Pegue o melhor hook e gere 5 variações mais curtas e mais agressivas, mantendo a clareza.' },
    { stage: Stage.ROTEIRO, title: 'Escrever roteiro', isDefault: true, body: 'Escreva o roteiro completo de 30–45s seguindo dor → quebra de crença → mecanismo → benefício → CTA, no tom direto para dono de agência. Inclua textos de tela curtos.' },
    { stage: Stage.ROTEIRO, title: 'Encurtar mantendo a quebra', body: 'Encurte o roteiro para caber em ~30s sem perder a quebra de crença. Marque o que cortar.' },
    { stage: Stage.DIRECAO_CRIATIVA, title: 'Direção de vídeo', isDefault: true, body: 'Liste a direção de edição: cortes, ritmo, b-roll, textos de tela e sugestão de trilha. Indique o formato mais adequado.' },
    { stage: Stage.DIRECAO_CRIATIVA, title: 'Estrutura de carrossel', body: 'Estruture um carrossel: defina o conteúdo de cada slide (título, texto e elemento visual), a paleta e a hierarquia visual.' },
    { stage: Stage.COPY_LEGENDA_CTA, title: 'Escrever legenda + CTAs', isDefault: true, body: 'Escreva a legenda para a peça (gancho na primeira linha, corpo e fechamento) e 3 variações de CTA, mantendo a Regra de Ouro.' },
    { stage: Stage.ESCALAR_RECICLAR, title: 'Gerar derivados', isDefault: true, body: 'Transforme essa peça vencedora em ativos derivados (carrossel, e-mail, script de SDR, post de LinkedIn, novos hooks). Adapte a mensagem a cada canal.' },
  ];

  for (const p of prompts) {
    const exists = await prisma.promptTemplate.findFirst({ where: { stage: p.stage, title: p.title, builtIn: true } });
    if (!exists) {
      await prisma.promptTemplate.create({
        data: { stage: p.stage, title: p.title, body: p.body, isDefault: p.isDefault ?? false, builtIn: true },
      });
    }
  }

  console.log('✅  Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
