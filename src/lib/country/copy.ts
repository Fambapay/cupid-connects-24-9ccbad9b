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
    line1: "Encontra alguém",
    leadHtml:
      'Hunie é a comunidade de encontros <span class="ll-italic">membership-only</span> de Moçambique. Perfis verificados, conversas em português, preços em MZN.',
    ctaPrimary: "Instalar app",
    ctaSecondary: "Criar conta grátis",
  },
  social: { handles: "Hunie · Moçambique" },
  planos: {
    sub: "Sem letra pequena. Cancelas quando quiseres. Pagas em MZN com M-Pesa, e-Mola ou cartão.",
  },
  final: { sub: "Junta-te aos solteiros de Moçambique." },
  testimonials: [
    { text: "Conheci o Mário aqui. Três meses depois ainda estamos juntos. Coisa rara, hoje em dia.", name: "Carla", meta: "Maputo · 28" },
    { text: "Finalmente uma app feita para nós. Sem pessoas a fingir, sem perfis estranhos.", name: "Tiago", meta: "Matola · 31" },
    { text: "Adoro que pago em MZN com M-Pesa. Tudo simples, tudo cá.", name: "Joana", meta: "Beira · 25" },
  ],
  faq: [
    { q: "É só para Moçambique?", a: "Sim. Hunie foi pensada para Moçambique — preços em MZN, M-Pesa, perfis verificados nas principais cidades." },
    { q: "Como funciona a verificação?", a: "Tiras uma selfie que comparamos com a tua foto de perfil. Demora menos de um minuto e recebes o ✓ verificado." },
    { q: "Posso cancelar quando quiser?", a: "Sim. Cancelas no settings em dois toques. Mantens o acesso até ao fim do ciclo pago." },
    { q: "Os meus dados estão seguros?", a: "Encriptação ponta-a-ponta nas conversas. Nunca vendemos dados. Nunca." },
  ],
  seo: {
    title: "Hunie — Namoro em Moçambique. Comunidade verificada.",
    description:
      "Hunie é a comunidade de encontros feita em Moçambique. Perfis verificados em Maputo, Matola, Beira, Nampula e Chimoio. Preços em MZN, pagamento M-Pesa.",
    ogTitle: "Hunie — Namoro em Moçambique",
    ogDescription:
      "Comunidade de encontros membership-only feita em MZ. Maputo, Matola, Beira, Nampula, Chimoio.",
    twitterDescription: "Comunidade verificada. Conversas em PT. Preços em MZN.",
    keywords:
      "namoro moçambique, dating maputo, encontros beira, solteiros matola, app namoro mz, hunie",
    canonical: "https://hunie.app",
    ogUrl: "https://hunie.app",
    priceFrom: "199",
    areaServed: "Mozambique",
  },
};

const AO: CountryCopy = {
  hero: {
    eyebrow: "🇦🇴 Pensado para Angola",
    line1: "Encontra alguém",
    leadHtml:
      'Hunie é a comunidade de encontros <span class="ll-italic">membership-only</span> de Angola. Perfis verificados, conversas em português, preços em Kz.',
    ctaPrimary: "Instalar app",
    ctaSecondary: "Criar conta grátis",
  },
  social: { handles: "Hunie · Angola" },
  planos: {
    sub: "Sem letra pequena. Cancelas quando quiseres. Pagas em Kz com Multicaixa Express, Unitel Money ou cartão.",
  },
  final: { sub: "Junta-te aos solteiros de Angola." },
  testimonials: [
    { text: "Conheci a Inês aqui em Luanda. Dois meses depois ainda estamos a sair. Vale a pena.", name: "Marco", meta: "Luanda · 29" },
    { text: "Finalmente uma app séria, feita para nós. Sem perfis estranhos, sem ruído.", name: "Joana", meta: "Benguela · 27" },
    { text: "Pagar com Multicaixa Express é simples — tudo em Kz, sem dores de cabeça.", name: "Inês", meta: "Lubango · 31" },
  ],
  faq: [
    { q: "O Hunie funciona em Angola?", a: "Sim. O Hunie é a comunidade de encontros pensada para Angola — preços em Kz, pagamentos Multicaixa Express, Unitel Money e cartões, perfis verificados em Luanda, Benguela, Huambo, Lobito e Lubango." },
    { q: "Quanto custa usar o Hunie?", a: "Três planos: Select 1 500 Kz, Plus 4 500 Kz e Elite 7 500 Kz por mês. Pagas com Multicaixa Express, Referência Multicaixa, Unitel Money ou cartão Visa/Mastercard." },
    { q: "Em que cidades de Angola há mais utilizadores?", a: "Luanda lidera, seguida de Benguela, Lobito, Huambo e Lubango. Estamos a crescer rapidamente em Cabinda, Namibe, Malanje, Kuito e Soyo." },
    { q: "Como funciona a verificação de perfil?", a: "Tiras uma selfie a fazer um gesto simples — a nossa IA compara com as fotos do teu perfil em segundos. Recebes o badge azul de verificado e apareces mais no feed." },
    { q: "Posso pagar com Multicaixa ou Unitel Money?", a: "Sim. Aceitamos Multicaixa Express, Referência Multicaixa, Unitel Money e cartões Visa/Mastercard. Tudo em kwanzas (Kz), sem conversões surpresa." },
    { q: "Os meus dados estão seguros?", a: "Encriptamos as tuas conversas, fotos privadas e dados de pagamento. Nunca vendemos dados a terceiros. Podes apagar a tua conta a qualquer momento." },
    { q: "Como cancelo a subscrição?", a: "Perfil → Definições → Subscrição → Cancelar. Imediato. Mantens acesso até ao fim do período já pago. Sem chamadas, sem letras pequenas." },
  ],
  seo: {
    title: "Hunie — Namoro em Angola. Comunidade verificada em Luanda, Benguela e Huambo.",
    description:
      "Hunie é a comunidade de encontros feita para Angola. Perfis verificados em Luanda, Benguela, Huambo, Lobito e Lubango. Preços em Kz, pagamento Multicaixa Express e Unitel Money.",
    ogTitle: "Hunie — Namoro em Angola",
    ogDescription:
      "Comunidade de encontros membership-only para Angola. Luanda, Benguela, Huambo, Lobito, Lubango.",
    twitterDescription: "Comunidade verificada. Conversas em PT. Preços em Kz. Multicaixa e Unitel Money.",
    keywords:
      "namoro angola, dating luanda, encontros benguela, solteiros huambo, app namoro angola, hunie angola",
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
