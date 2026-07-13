/**
 * Base de conhecimento da Lumen Digital (PRD-012 / SPEC-012).
 * Fonte única do `CompanyProfile` singleton — o modelo de negócio WHITE LABEL da
 * landing page, estruturado nos campos do perfil. Reusado pelo seed principal
 * (`seed.ts`) e pelo script de conhecimento (`seed-knowledge.ts`).
 *
 * Embasa TODAS as gerações de IA via `buildCompanyContext()`, sempre como DADO.
 * Ajuste este arquivo (ou a tela /empresa) quando o posicionamento mudar.
 */
import type { CompanyProfileInput } from '@content-engine/shared';

export const LUMEN_COMPANY_PROFILE: CompanyProfileInput = {
  companyName: 'Lumen Digital',

  about:
    'A Lumen Digital é a estrutura WHITE LABEL completa para agências que querem vender tecnologia com a própria marca e criar uma nova fonte de RECEITA RECORRENTE. ' +
    'Em vez de vender só serviço (trocar horas por dinheiro), a agência passa a REVENDER uma plataforma própria — CRM, IA, WhatsApp, automação, follow-up, agendamento, disparos, anúncios e gestão comercial — para os seus clientes, tudo com domínio, logo e identidade visual do parceiro. ' +
    'A Lumen opera toda a tecnologia e infraestrutura nos bastidores e NUNCA fala com o cliente final. O parceiro é o único ponto de contato: ele define o preço e o ciclo, cobra o cliente diretamente, paga a Lumen por cliente ativo, e a diferença vira MARGEM RECORRENTE todo mês. A agência deixa de vender hora e passa a vender assinatura — vira dona de produto. ' +
    'Não é "login e senha" de uma ferramenta genérica: há implantação orientada com a equipe, marca/domínio/ambiente configurados, treinamento do time do parceiro, suporte técnico próximo no arranque e acompanhamento até a primeira venda.',

  offerings:
    'LumenCRM white label — uma operação de tecnologia inteira revendida com a marca do parceiro. +80 funcionalidades organizadas por objetivo de negócio: ' +
    '• PARA VENDER MAIS: CRM visual com kanban automático, follow-up inteligente, agendamento direto pela IA, ações automáticas por etapa do funil, qualificação de leads em tempo real. ' +
    '• PARA RETER CLIENTES: dashboard com 36+ métricas, histórico completo de conversas, relatórios automáticos, notificações no WhatsApp para o gestor, gestão de funis e estágios. ' +
    '• PARA GERAR VALOR PERCEBIDO: multi-agentes de IA especializados, fluxos/chatbot com IA e classificador de intenção, ligações por IA com voz humana (ElevenLabs), disparos PRO com WhatsApp Business API, formulários do Meta nativos, inteligência de anúncios + ROI real, Facebook CAPI server-to-server. ' +
    '• PARA OPERAR COMO SaaS: white label completo com domínio próprio, SMTP configurável, checkout por webhook que cria contas sozinho, permissões e departamentos por equipe, central de suporte e tickets. ' +
    'Modelo de receita do parceiro: ASSINATURA RECORRENTE por cliente ativo (não hora de serviço). A Lumen cobra o parceiro por cliente ativo; a diferença é a margem do parceiro.',

  personas: [
    {
      name: 'Dono de agência de serviço (público-alvo)',
      description:
        'Já vende serviço para empresas (tráfego, social media, gestão comercial, automação); tem operação comercial ou carteira de clientes; quer aumentar ticket e retenção dos clientes atuais e vender tecnologia com a própria marca; entende que implantação e suporte têm valor. Pode embutir o LumenCRM em pacotes que já vende.',
      pains:
        'Vive só de serviço e deixa receita recorrente na mesa; cada novo cliente traz mais atendimento/suporte/reunião; a margem aperta conforme a equipe cresce; a operação depende de gente e trava quando alguém sai; retenção fraca — sem ferramenta integrada, o cliente acha que é só serviço e sai sem dor.',
    },
    {
      name: 'NÃO é público (anti-persona — não mirar)',
      description:
        'Quem só quer testar uma ferramenta barata, não tem clientes/audiência/operação mínima, espera que o software venda sozinho, não quer investir em implantação ou busca a opção mais barata do mercado. O conteúdo NÃO deve falar com esse perfil nem competir por preço.',
      pains: '',
    },
  ],

  mainPains:
    'Agência presa ao serviço: mais clientes = mais atendimento, suporte, cobrança e reunião; a margem aperta porque mais entrega exige mais equipe; a operação não escala (o fluxo depende de gente e trava quando alguém sai); a retenção é fraca porque o cliente enxerga só serviço e sai quando o resultado cai; o faturamento sobe mas a sobra diminui; falta receita recorrente e previsível.',

  toneOfVoice:
    'Direto, específico para dono de agência, sem enrolação. Foco em modelo de negócio (serviço → produto/assinatura), margem e receita recorrente — não em "features de CRM". Honesto sobre "para quem é / não é" (o critério é maturidade, não preço). Usa prova sem prometer ganho garantido (o resultado depende da operação, carteira, nicho, oferta e execução do parceiro). Evita jargão vazio e o clichê de "CRM genérico".',

  differentiators:
    'Não é ferramenta barata de massa: implantação orientada com a equipe, marca/domínio/ambiente configurados, treinamento do time do parceiro, suporte técnico próximo no arranque e acompanhamento até a primeira venda. White label de verdade — o cliente final nem sabe que a Lumen existe. Tecnologia mantida e atualizada pela Lumen. Recursos que os concorrentes não têm: multi-agentes de IA, ligações por IA com voz humana, Facebook CAPI (server-to-server), disparos PRO, formulários do Meta nativos, inteligência de anúncios + ROI real.',

  proofCases:
    '+300 parceiros ativos; +8.000 usuários na plataforma; o maior parceiro fatura +R$ 400 mil/mês usando a operação como base. Sempre com ressalva honesta: resultado não é garantido — depende da operação comercial, carteira de clientes, nicho, oferta e execução de cada parceiro. É prova de potencial, não promessa de ganho.',

  dos: [
    'Falar de transformação de modelo: parar de vender só serviço e virar dono de produto com receita recorrente',
    'Explicar a matemática da margem: o parceiro cobra o cliente, paga a estrutura por cliente ativo e fica com a diferença todo mês',
    'Reforçar o white label: marca, domínio e identidade do parceiro; a Lumen nunca fala com o cliente final',
    'Usar as provas com ressalva honesta (+300 parceiros, +8k usuários, +R$400k/mês; resultado não garantido)',
    'Enfatizar o valor de implantação, treinamento e suporte (não é só "login e senha")',
    'Mirar o dono de agência com operação/carteira madura',
  ],

  donts: [
    'Não posicionar como "só mais um CRM" nem como ferramenta genérica de conversão de leads da própria agência',
    'Não vender pelo menor preço nem por "sem taxa de setup" (o critério é maturidade, não preço)',
    'Não prometer ganho garantido nem citar os números como promessa de resultado',
    'Não falar com quem só quer testar ferramenta barata ou espera o software vender sozinho',
    'Não expor ao cliente final que a tecnologia é da Lumen; não sugerir publicação/automação de postagem',
  ],

  keywords: [
    'white label',
    'receita recorrente',
    'margem recorrente',
    'revenda com a própria marca',
    'dono de produto',
    'assinatura',
    'LumenCRM',
    'operação de tecnologia',
    'ticket e retenção',
    'agência que só vende serviço',
    'SaaS com a sua marca',
    'escalar sem depender de horas',
  ],

  links: ['https://lumendigital.com.br', 'contato@lumendigital.com.br', '(62) 9281-5826'],
};
