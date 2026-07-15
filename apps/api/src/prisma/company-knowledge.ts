/**
 * Base de conhecimento da LumenCRM (PRD-012 / PRD-015).
 * Fonte única do `CompanyProfile` singleton — o modelo WHITE LABEL e as DIRETRIZES DE
 * MARKETING (consultoria de 14/07/2026) estruturadas nos campos do perfil. Reusado
 * pelo seed principal (`seed.ts`) e pelo script de conhecimento (`seed-knowledge.ts`).
 *
 * Embasa TODAS as gerações de IA via `buildCompanyContext()`, sempre como DADO.
 * Ajuste este arquivo (ou a tela /empresa) quando o posicionamento/diretrizes mudarem.
 * Limites do CompanyProfileSchema: about/offerings/mainPains/differentiators/proofCases ≤ 4000;
 * toneOfVoice ≤ 2000; companyName ≤ 200.
 */
import type { CompanyProfileInput } from '@content-engine/shared';

export const LUMEN_COMPANY_PROFILE: CompanyProfileInput = {
  companyName: 'LumenCRM',

  about:
    'A LumenCRM é a plataforma WHITE LABEL completa para agências de marketing/tráfego: agente de IA no WhatsApp, CRM com follow-up automatizado, disparos, ligação com IA, e-mail marketing e TODO o processo comercial num só lugar — com a marca da agência. ' +
    'Ela NÃO vende "mais uma ferramenta": dá ao dono de agência a SAÍDA do mercado de tráfego saturado — um NOVO PRODUTO para vender (o processo comercial com IA, white label), que aumenta o LTV dele e mexe diretamente no faturamento do cliente final. ' +
    'PORTA DE ENTRADA da comunicação: a IA de atendimento white label (o hype que trava a atenção do dono de agência). PRODUTO REAL: o funil comercial inteiro no lugar. O CRM é a SUSTENTAÇÃO da promessa (onde está o resultado mensurável), NUNCA o gancho — o cliente precisa ser educado sobre como ganha dinheiro com o processo antes de valorizá-lo.',

  offerings:
    'PROCESSO COMERCIAL COMPLETO COM IA, white label (com a marca do parceiro): IA que ATENDE e AGENDA no WhatsApp + CRM que MOVE o lead sozinho (follow-up e movimentações automáticas) + FOLLOW-UP automatizado que recupera quem esfriou + DISPAROS + LIGAÇÃO com IA + E-MAIL. É o funil inteiro, não um chatbot solto. ' +
    'MENSAGENS CENTRAIS (pilares de conteúdo): ' +
    '(1) NOVO PRODUTO — "o mercado de tráfego quebrou; quem cresce vende um produto diferente: processo comercial com IA, com a sua marca". ' +
    '(2) RESULTADO/FATURAMENTO — "o dono de negócio só para para olhar quando vê um faturamento que ele não tem" (ex.: conversão 3%→7% dobra o faturamento; R$1.000/mês de recorrência por cliente; ~R$10 mil/mês de recorrência com a base). ' +
    '(3) PROCESSO COMPLETO — "qualquer um pluga um GPT no WhatsApp; nós entregamos o funil inteiro (IA que atende e agenda, CRM que move o lead sozinho, follow-up que recupera quem esfriou, disparos, ligação com IA e e-mail)". ' +
    '(4) LTV/RETENÇÃO — "seu cliente não cancela quando você mexe no faturamento dele". ' +
    'LÓGICA ECONÔMICA (usar sempre): não dá pra cobrar R$1.500 por tráfego puro, mas dá pra cobrar R$1.000+/mês pelo processo comercial com IA; custo operacional baixo (sem gestor de tráfego, editor de vídeo nem CS extra); mexer no faturamento do cliente → LTV maior, churn menor, recorrência nova. Todo conteúdo é produzido para o INSTAGRAM (Reels e posts/carrossel).',

  personas: [
    {
      name: 'Dono de agência de marketing/tráfego (ICP primário)',
      description:
        'Dono de agência pequena/média cujo principal produto é gestão de tráfego. Sente o mercado saturado, não consegue mais precificar tráfego e vê clientes cancelando. É o DECISOR e compra rápido quando enxerga a conta fechando. Já ouviu falar de IA de atendimento (o hype), mas ainda não entende o valor do CRM/processo completo. Sinal de qualificação máxima: já tentou montar atendimento com IA por conta própria (n8n/GPT/Evolution) e sentiu a dor de manter aquilo de pé.',
      pains:
        'Gera lead mas o cliente não vende (não converte) → o cliente culpa a agência e cancela; LTV baixo / churn alto (recomeça todo mês); não consegue precificar (tráfego virou commodity ~R$300/conta); sem diferencial (faz o mesmo que milhares de agências); teme virar commodity e perder a agência.',
    },
    {
      name: 'Gestor de tráfego solo / freelancer (ICP secundário)',
      description:
        'Está apanhando na prospecção e na precificação; quer escapar da guerra de preço virando "agência de solução", não de mídia. Entra bem pelo funil de conteúdo educativo (mini treinamento: "por que o tráfego sozinho não funciona mais").',
      pains: 'CPM caro, cold call rejeitada, tráfego puro sem margem, sem produto próprio para vender.',
    },
    {
      name: 'Mentores/educadores com alunos donos de agência (ICP terciário — perfil "Everton")',
      description:
        'Monetizam a ferramenta com a própria audiência/base de alunos; alto potencial de recorrência em escala (um mentor traz dezenas de contas white label).',
      pains: 'Quer uma nova fonte de recorrência e um produto para oferecer à base sem operar tecnologia.',
    },
    {
      name: 'NÃO é público (anti-persona — não mirar)',
      description:
        'O EMPRESÁRIO FINAL (dono de clínica, loja etc.) é o cliente do NOSSO cliente — aparece nos exemplos e provas, mas a comunicação NÃO é para ele. Também não miramos curiosos de IA sem negócio rodando nem quem procura "só um chatbot barato". O conteúdo não fala com esse perfil nem compete por preço.',
      pains: '',
    },
  ],

  mainPains:
    'DORES DE NEGÓCIO (priorize sempre): (1) "eu gero lead, mas o cliente não vende" → o cliente culpa a agência e cancela; (2) LTV baixo / churn alto → a agência vive recomeçando todo mês; (3) não consegue precificar → tráfego virou commodity (~R$300/conta); (4) sem diferencial → faz o mesmo que milhares de agências; (5) CAC alto da própria agência → CPM caro, cold call rejeitada. ' +
    'DORES OPERACIONAIS: depende de time (gestor/editor/CS) para escalar; não controla o comercial do cliente; leads esfriam por falta de follow-up; ferramentas soltas (bot aqui, planilha ali, CRM de outro lado) que não conversam. ' +
    'DORES EMOCIONAIS: cansaço de "vender tráfego" e apanhar na reunião; medo de ficar para trás na onda da IA; frustração de ver o concorrente oferecendo "IA" e ele sem resposta. ' +
    'DESEJOS (o outro lado da dor): ter um produto próprio, com a marca dele, que ninguém na cidade tem; recorrência previsível que não depende de resultado de mídia; ser visto pelo cliente como parceiro de faturamento (não fornecedor de anúncio); escalar sem contratar.',

  toneOfVoice:
    'Direto e concreto — números, casos, telas; zero abstração ("potencialize sua gestão" é proibido). De dono para dono — fale como quem opera agência e vive a dor, não como software house. Conversacional — natural, como conversa de call, sem roteiro engessado; gírias leves do nicho são bem-vindas (LTV, churn, cold call, passagem de bastão). Provocador na dor — nomeie a realidade sem rodeio ("o mercado de tráfego quebrou", "seu cliente vai cancelar"). Autoridade por prova — nunca "somos os melhores"; sempre "olha o que aconteceu aqui" (tela, print, caso, número). Anti-IA na escrita — a copy é feita à mão; se soar "de ChatGPT", converte menos.',

  differentiators:
    'O FUNIL COMERCIAL INTEIRO no lugar (IA de atendimento + CRM + follow-up automatizado + movimentações automáticas + disparos + ligação com IA + e-mail), com a marca da agência — não um GPT solto no WhatsApp. White label de verdade: o cliente final nem sabe que a LumenCRM existe. A TELA do sistema vende (bonita e completa) — mostrar a tela é o nosso padrão-ouro de criativo. Recursos que a concorrência não tem: multi-agentes de IA, ligação por IA com voz humana, follow-up/movimentação automática que reativa o lead e agenda a call sozinho, disparos PRO, inteligência de anúncios + ROI real.',

  proofCases:
    'Use com RESSALVA HONESTA (é prova de potencial, não promessa de ganho): ' +
    'fechamento via follow-up/movimentação automática (lead reativado pelo CRM agendou e fechou na call); ' +
    'lead que passou pela IA de atendimento (IARA) às 20h, agendou sozinho, confirmou e compareceu — atendimento e agendamento 100% IA em tempo real; ' +
    'recorrência de ~R$10 mil/mês de um mentor com alunos donos de agência (perfil Everton); ' +
    'base da plataforma: +300 parceiros ativos, +8.000 usuários, maior parceiro fatura +R$400 mil/mês. ' +
    'Priorize captar e usar DEPOIMENTOS EM VÍDEO de white labels. O resultado depende da operação comercial, carteira, nicho, oferta e execução de cada parceiro.',

  dos: [
    'Liderar pela IA de atendimento white label (o hype que trava a atenção) e então abrir o processo comercial completo com IA',
    'Comunicar quanto e como a galera fatura, com números concretos (conversão 3%→7%, R$1.000/mês de recorrência por cliente, ~R$10 mil/mês com a base)',
    'Mostrar a TELA DO SISTEMA (nosso maior ativo visual) e usar gancho forte nos 3 primeiros segundos',
    'Estruturar todo criativo: gancho (0–3s) → desenvolvimento (mecanismo) → prova (tela/número/caso) → CTA de agendar call',
    'Falar do negócio do dono de agência: LTV, churn, precificação, novo produto, recorrência',
    'Usar as provas com ressalva honesta; priorizar casos e depoimentos de white labels',
  ],

  donts: [
    'Não vender "ferramenta" nem fazer demo de features soltas',
    'Não liderar a comunicação com "CRM" (é sustentação, não gancho)',
    'Não usar copy genérica com cara de IA/ChatGPT ("solução inovadora", "revolucione", "otimize seu atendimento")',
    'Não usar "chatbot" — usar "agente de IA" / "IA de atendimento"',
    'Não falar para o empresário final (o público é a AGÊNCIA)',
    'Não prometer "viralizar" nem usar métrica de vaidade (seguidores não vende)',
    'Não subir criativo sem gancho forte nos 3 primeiros segundos',
    'Não competir por preço nem entrar na guerra do "bot barato"',
  ],

  keywords: [
    'processo comercial com IA',
    'IA de atendimento',
    'white label',
    'com a sua marca',
    'novo produto para a sua agência',
    'funil inteiro no lugar',
    'LTV',
    'recorrência',
    'follow-up automatizado',
    'lead agendado sozinho',
    'mexer no faturamento do seu cliente',
    'CRM que move o lead sozinho',
    'agente de IA no WhatsApp',
    'ligação com IA',
    'dono de produto',
  ],

  links: ['https://lumendigital.com.br', 'contato@lumendigital.com.br', '(62) 9281-5826'],
};
