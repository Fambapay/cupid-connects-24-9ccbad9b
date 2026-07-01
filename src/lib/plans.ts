import { PLAN_PRICES, getPlanPrices, type PlanTier } from "./pricing";
import {
  DEFAULT_COUNTRY,
  formatCountryPrice,
  type CountryCode,
} from "./country/config";

export type MembershipTier = "free" | PlanTier;

export interface PlanEntitlements {
  dailyLikes: number; // -1 = unlimited
  dailySuperLikes: number;
  weeklyBoosts: number;
  dailyBoosts: number;
  canRewind: boolean;
  canSeeWhoLiked: boolean;
  canUseAdvancedFilters: boolean;
  canPassport: boolean;
  canReadReceipts: boolean;
  priorityDiscovery: boolean;
  eliteBadge: boolean;
  invisibleMode: boolean;

  profileAnalytics: boolean;
  earlyAccess: boolean;
  canSendFirstImpression: boolean;
}

export const NO_TIER_ENTITLEMENTS: PlanEntitlements = {
  dailyLikes: 0,
  dailySuperLikes: 0,
  weeklyBoosts: 0,
  dailyBoosts: 0,
  canRewind: false,
  canSeeWhoLiked: false,
  canUseAdvancedFilters: false,
  canPassport: false,
  canReadReceipts: false,
  priorityDiscovery: false,
  eliteBadge: false,
  invisibleMode: false,

  profileAnalytics: false,
  earlyAccess: false,
  canSendFirstImpression: false,
};

export const SELECT: PlanEntitlements = {
  ...NO_TIER_ENTITLEMENTS,
  dailyLikes: -1,
  dailySuperLikes: 1,
};

export const PLUS: PlanEntitlements = {
  ...SELECT,
  dailySuperLikes: 5,
  weeklyBoosts: 1,
  canRewind: true,
  canSeeWhoLiked: true,
  canUseAdvancedFilters: true,
  canPassport: true,
  canReadReceipts: true,
};

export const ELITE: PlanEntitlements = {
  ...PLUS,
  dailySuperLikes: 10,
  weeklyBoosts: 0,
  dailyBoosts: 1,
  priorityDiscovery: true,
  eliteBadge: true,
  invisibleMode: true,

  profileAnalytics: true,
  earlyAccess: true,
  canSendFirstImpression: true,
};

export function getEntitlements(tier: MembershipTier | null | undefined): PlanEntitlements {
  switch (tier) {
    case "select": return SELECT;
    case "plus":   return PLUS;
    case "elite":  return ELITE;
    default:       return NO_TIER_ENTITLEMENTS;
  }
}

export interface PlanHighlight {
  label: string;
  bold?: boolean;
}

export interface PlanCardConfig {
  tier: PlanTier;
  label: string;
  /** Monthly price in the country's currency */
  priceMzn: number;
  /** Annual price in the country's currency */
  annualPriceMzn: number;
  tagline: string;
  badge?: string;
  accent: string;
  highlights: PlanHighlight[];
}

const PLAN_META: Omit<PlanCardConfig, "priceMzn" | "annualPriceMzn">[] = [
  {
    tier: "elite",
    label: "Elite",
    tagline: "Para quem não quer esperar pelo destino.",
    badge: "VIP",
    accent: "#C9A84C",
    highlights: [
      { label: "Primeiro no feed de toda a gente", bold: true },
      { label: "Badge Elite que muda como te veem" },
      { label: "Verificação prioritária" },
      { label: "10 Super Likes por dia" },
      { label: "1 Boost diário (10x mais perfis)" },
      { label: "Modo invisível — vê sem ser visto" },
      { label: "Suporte VIP em minutos" },
    ],
  },
  {
    tier: "plus",
    label: "Plus",
    tagline: "Pára de adivinhar quem gosta de ti.",
    badge: "Mais popular",
    accent: "#F0468C",
    highlights: [
      { label: "Vê quem já te deu like", bold: true },
      { label: "Likes ilimitados — sem travar" },
      { label: "5 Super Likes por dia" },
      { label: "1 Boost grátis por semana" },
      { label: "Filtros avançados (altura, signo, hábitos)" },
      { label: "Sabe quando leem as tuas mensagens" },
      { label: "Sem anúncios" },
    ],
  },
  {
    tier: "select",
    label: "Select",
    tagline: "Dá o primeiro passo a sério.",
    accent: "#5BB8FF",
    highlights: [
      { label: "Likes ilimitados", bold: true },
      { label: "1 Super Like por dia (3x mais matches)" },
      { label: "1 Boost de boas-vindas" },
      { label: "Volta atrás no último swipe" },
      { label: "Filtros básicos" },
    ],
  },
];

/** Country-aware plan cards. Default MZ for legacy callers. */
export function getPlanCards(country: CountryCode = DEFAULT_COUNTRY): PlanCardConfig[] {
  const prices = getPlanPrices(country);
  return PLAN_META.map((meta) => {
    const p = prices[meta.tier];
    return {
      ...meta,
      priceMzn: p.price,
      annualPriceMzn: p.annualPrice,
    };
  });
}

/** Legacy MZ-only export, still used by code paths not yet country-aware. */
export const PLAN_CARDS: PlanCardConfig[] = PLAN_META.map((meta) => {
  const p = PLAN_PRICES[meta.tier];
  return { ...meta, priceMzn: p.price, annualPriceMzn: p.annualPrice };
});

/** Format a price in the active country's currency. */
export function formatPrice(amount: number, country: CountryCode = DEFAULT_COUNTRY): string {
  return formatCountryPrice(amount, country);
}
