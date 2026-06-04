import { PLAN_PRICES, type PlanTier } from "./pricing";

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
}

export const NO_TIER_ENTITLEMENTS: PlanEntitlements = {
  dailyLikes: 25,
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
};

const SELECT: PlanEntitlements = {
  ...NO_TIER_ENTITLEMENTS,
  dailyLikes: -1,
  dailySuperLikes: 1,
};

const PLUS: PlanEntitlements = {
  ...SELECT,
  dailySuperLikes: 5,
  weeklyBoosts: 1,
  canRewind: true,
  canSeeWhoLiked: true,
  canUseAdvancedFilters: true,
  canPassport: true,
  canReadReceipts: true,
};

const ELITE: PlanEntitlements = {
  ...PLUS,
  dailySuperLikes: 10,
  weeklyBoosts: 0,
  dailyBoosts: 1,
  priorityDiscovery: true,
  eliteBadge: true,
  invisibleMode: true,
  
  profileAnalytics: true,
  earlyAccess: true,
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
  priceMzn: number;
  tagline: string;
  badge?: string;
  accent: string;
  highlights: PlanHighlight[];
}

export const PLAN_CARDS: PlanCardConfig[] = [
  {
    tier: "select",
    label: "Select",
    priceMzn: PLAN_PRICES.select.priceMzn,
    tagline: "Aparece. Sem ser ignorado.",
    accent: "#5BB8FF",
    highlights: [
      { label: "1 Boost grátis (30 min) na ativação", bold: true },
      { label: "Selo Verificado no teu perfil", bold: true },
      { label: "Likes ilimitados" },
      { label: "1 Super Like por dia" },
      { label: "Sem anúncios" },
    ],
  },
  {
    tier: "plus",
    label: "Plus",
    priceMzn: PLAN_PRICES.plus.priceMzn,
    tagline: "Tudo do Select, mais controlo e visibilidade.",
    badge: "Mais popular",
    accent: "#F0468C",
    highlights: [
      { label: "Vê quem te curtiu", bold: true },
      { label: "Rewind ilimitado" },
      { label: "Filtros avançados" },
      { label: "Passport — muda de cidade" },
      { label: "Read receipts" },
      { label: "1 Boost / semana" },
      { label: "5 Super Likes / dia" },
    ],
  },
  {
    tier: "elite",
    label: "Elite",
    priceMzn: PLAN_PRICES.elite.priceMzn,
    tagline: "VIP. Prioridade absoluta no Hunie.",
    badge: "VIP",
    accent: "#C9A84C",
    highlights: [
      { label: "Prioridade no discovery", bold: true },
      { label: "Boost diário" },
      { label: "Modo invisível" },
      
      { label: "Analytics de perfil" },
      { label: "Badge Elite" },
      { label: "10 Super Likes / dia" },
    ],
  },
];

export function formatPrice(mzn: number) {
  return `${mzn.toLocaleString("pt-PT")} MZN`;
}
