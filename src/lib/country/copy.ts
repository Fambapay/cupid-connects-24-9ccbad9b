// Per-country landing + onboarding copy. Keep keys identical across
// countries; components read by key, never hardcode strings.
import type { CountryCode } from "./config";

export interface CountryCopy {
  hero: {
    eyebrow: string;
    line1: string;
    leadHtml: string; // contains <span class="ll-italic"> markers
    ctaPrimary: string;
    ctaSecondary: string;
  };
  social: {
    handlesMz?: never;
    handles: string;
  };
  planos: {
    sub: string;
  };
  final: {
    sub: string;
  };
  testimonials: { text: string; name: string; meta: string }[];
  faq: { q: string; a: string }[];
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    twitterDescription: string;
    keywords: string;
    canonical: string;
    ogUrl: string;
    priceFrom: string; // e.g. "149" for JSON-LD MZN, "1500" for AOA
    areaServed: string; // "Mozambique" / "Angola"
  };
}

const MZ: CountryCopy = {
  hero: {
    eyebrow: "🇲🇿 Feito em Moçambique",
    line1: "Pessoas reais,",
    leadHtml:
      'Hunie é a comunidade <span class="ll-italic">membership-only</span> de namoro em Moçambique. Perfis verificados com selfie, conversas em português, pagamentos em meticais — sem perfis falsos a fingir que vivem aqui.',
    ctaPrimary: "Instalar app",
    ctaSecondary: "Criar conta grátis",
  },
  social: { handles: "Hunie · Moçambique" },
  planos: {
    sub: "Sem letra pequena. Cancelas em dois toques. Pagas em meticais com M-Pesa, e-Mola, Visa ou Mastercard — tudo cá, sem conversões surpresa.",
  },
  final: { sub: "Junta-te aos solteiros de Maputo, Matola, Beira, Nampula e Chimoio." },
  testimonials: [
    { text: "Conheci o Mário aqui em Maputo. Três meses depois ainda estamos juntos — e isso, hoje em dia, é coisa rara.", name: "Carla", meta: "Maputo · 28" },
    { text: "Finalmente uma app feita para nós. Sem pessoas a fingir, sem perfis estranhos, sem ter de explicar onde fica a Matola.", name: "Tiago", meta: "Matola · 31" },
    { text: "Pago com M-Pesa, em meticais. Demora dois segundos. Tudo simples, tudo cá.", name: "Joana", meta: "Beira · 25" },
  ],
  faq: [
    { q: "O Hunie é só para Moçambique?", a: "Sim. O Hunie foi pensado de raiz para Moçambique — preços em meticais, M-Pesa e e-Mola, perfis verificados em Maputo, Matola, Beira, Nampula, Chimoho e Pemba. Não somos mais uma app internacional traduzida à pressa." },
    { q: "Quanto custa usar o Hunie?", a: "Tens uma conta grátis para começar. Os planos pagos começam em 199 MT/mês (Select), com Plus e Elite para quem quer mais visibilidade, super likes e boosts. Pagas com M-Pesa, e-Mola ou cartão." },
    { q: "Como funciona a verificação de perfil?", a: "Tiras uma selfie a fazer um gesto simples. A nossa IA compara com as fotos do teu perfil em segundos e recebes o badge azul de verificado — apareces mais no feed e mostras a quem chega que és real." },
    { q: "Posso cancelar quando quiser?", a: "Sim. Perfil → Definições → Subscrição → Cancelar. Imediato. Mantens o acesso até ao fim do ciclo que já pagaste. Sem chamadas, sem letras pequenas, sem ginástica." },
    { q: "Os meus dados estão seguros?", a: "Encriptamos as tuas conversas, fotos privadas e dados de pagamento. Nunca vendemos dados a terceiros. Podes apagar a tua conta a qualquer momento e desaparece tudo." },
  ],
  seo: {
    title: "Hunie — Namoro sério em Moçambique. Perfis verificados.",
    description:
      "Hunie é a comunidade membership-only de namoro feita em Moçambique. Perfis verificados em Maputo, Matola, Beira, Nampula e Chimoio. Pagamentos em meticais com M-Pesa.",
    ogTitle: "Hunie — Namoro em Moçambique",
    ogDescription:
      "Comunidade verificada de namoro em Moçambique. Maputo, Matola, Beira, Nampula, Chimoio. Pagas em MT com M-Pesa.",
    twitterDescription: "Pessoas reais, perfis verificados, conversas em português. Pagas em meticais.",
    keywords:
      "namoro moçambique, dating maputo, encontros beira, solteiros matola, app namoro mz, hunie, m-pesa namoro",
    canonical: "https://hunie.app",
    ogUrl: "https://hunie.app",
    priceFrom: "199",
    areaServed: "Mozambique",
  },
};

const AO: CountryCopy = {
  hero: {
    eyebrow: "🇦🇴 Feito para Angola",
    line1: "Pessoas reais,",
    leadHtml:
      'Hunie é a comunidade <span class="ll-italic">membership-only</span> de namoro em Angola. Perfis verificados com selfie, conversas em português, pagamentos em kwanzas com Multicaixa Express — sem perfis falsos, sem ruído.',
    ctaPrimary: "Instalar app",
    ctaSecondary: "Criar conta grátis",
  },
  social: { handles: "Hunie · Angola" },
  planos: {
    sub: "Sem letra pequena. Cancelas em dois toques. Pagas em kwanzas com Multicaixa Express, Referência MC, Unitel Money ou cartão — tudo cá, sem conversões surpresa.",
  },
  final: { sub: "Junta-te aos solteiros de Luanda, Benguela, Huambo, Lobito e Lubango." },
  testimonials: [
    { text: "Conheci a Inês aqui em Luanda. Dois meses depois ainda estamos a sair — e nunca tive de explicar onde fica o Cassequel.", name: "Marco", meta: "Luanda · 29" },
    { text: "Finalmente uma app séria, feita para nós. Sem perfis estranhos, sem fotos antigas, sem ruído.", name: "Joana", meta: "Benguela · 27" },
    { text: "Pago com Multicaixa Express, em kwanzas. Dois cliques e está feito. Sem dores de cabeça.", name: "Inês", meta: "Lubango · 31" },
  ],
  faq: [
    { q: "O Hunie funciona em Angola?", a: "Sim. O Hunie foi pensado de raiz para Angola — preços em kwanzas, pagamentos Multicaixa Express, Referência MC, Unitel Money e cartões Visa/Mastercard, perfis verificados em Luanda, Benguela, Huambo, Lobito e Lubango." },
    { q: "Quanto custa usar o Hunie?", a: "Tens uma conta grátis para começar. Os planos pagos começam em 1 500 Kz/mês (Select), com Plus (4 500 Kz) e Elite (7 500 Kz) para quem quer mais visibilidade, super likes e boosts." },
    { q: "Em que cidades de Angola há mais utilizadores?", a: "Luanda lidera, seguida de Benguela, Lobito, Huambo e Lubango. Estamos a crescer rapidamente em Cabinda, Namibe, Malanje, Kuito e Soyo." },
    { q: "Como funciona a verificação de perfil?", a: "Tiras uma selfie a fazer um gesto simples — a nossa IA compara com as fotos do teu perfil em segundos. Recebes o badge azul de verificado e apareces mais no feed." },
    { q: "Posso pagar com Multicaixa Express ou Unitel Money?", a: "Sim. Aceitamos Multicaixa Express, Referência Multicaixa, Unitel Money e cartões Visa/Mastercard. Tudo em kwanzas, sem conversões surpresa, sem taxas escondidas." },
    { q: "Os meus dados estão seguros?", a: "Encriptamos as tuas conversas, fotos privadas e dados de pagamento. Nunca vendemos dados a terceiros. Podes apagar a tua conta a qualquer momento e desaparece tudo." },
    { q: "Como cancelo a subscrição?", a: "Perfil → Definições → Subscrição → Cancelar. Imediato. Mantens acesso até ao fim do período já pago. Sem chamadas, sem letras pequenas." },
  ],
  seo: {
    title: "Hunie — Namoro sério em Angola. Perfis verificados em Luanda, Benguela e Huambo.",
    description:
      "Hunie é a comunidade membership-only de namoro feita para Angola. Perfis verificados em Luanda, Benguela, Huambo, Lobito e Lubango. Pagas em kwanzas com Multicaixa Express e Unitel Money.",
    ogTitle: "Hunie — Namoro em Angola",
    ogDescription:
      "Comunidade verificada de namoro em Angola. Luanda, Benguela, Huambo, Lobito, Lubango. Pagas em Kz com Multicaixa.",
    twitterDescription: "Pessoas reais, perfis verificados, conversas em português. Pagas em kwanzas.",
    keywords:
      "namoro angola, dating luanda, encontros benguela, solteiros huambo, app namoro angola, hunie angola, multicaixa namoro",

    canonical: "https://ao.hunie.app",
    ogUrl: "https://ao.hunie.app",
    priceFrom: "1500",
    areaServed: "Angola",
  },
};

// ZA / PT placeholders reuse MZ until enabled.
export const COUNTRY_COPY: Record<CountryCode, CountryCopy> = {
  MZ,
  AO,
  ZA: MZ,
  PT: MZ,
};

export function getCountryCopy(country: CountryCode): CountryCopy {
  return COUNTRY_COPY[country] ?? MZ;
}
