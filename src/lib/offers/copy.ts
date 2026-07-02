// Copy oficial pt-MZ do sistema de ofertas.
// Não alterar sem alinhamento — estes textos vieram diretos do prompt de negócio.

export const OFFER_COPY = {
  welcomeDay1:
    "Tens 3 dias de acesso Elite completo. Likes ilimitados, vê quem gostou de ti, conversa sem limites. Aproveita. 🔥",

  trialDay2:
    "Oferta de lançamento: Premium por 149 MZN no 1º mês (em vez de 199). Só durante o teu trial.",

  postFirstMatch:
    "Boa! 🎉 Conversas como esta não esperam. Garante o teu acesso: 149 MZN no 1º mês.",

  likesReceived: (n: number) =>
    `${n} pessoas gostaram de ti. Com Premium vês sempre quem foi.`,

  last24hBanner: (countdown: string) =>
    `O teu acesso Elite termina em ${countdown}`,

  last24hSheet:
    "Última oportunidade: 99 MZN no 1º mês. Quando o trial acabar, esta oferta desaparece.",

  lockedMessage: (name: string) => `A ${name} respondeu-te — subscreve para ler`,

  lockedLikes: (n: number) => `${n} pessoas gostaram de ti`,

  winback7Push: {
    title: "As tuas conversas estão à tua espera 💬",
    body: "Volta ao Hunie com Premium por 99 MZN no 1º mês.",
  },

  winback14Push: (name: string) => ({
    title: `Última chamada, ${name}`,
    body: "99 MZN no 1º mês. Esta é a última oferta que te vamos enviar.",
  }),

  legalFooter: (regularPriceMinor: number, currency = "MZN") =>
    `Preço promocional válido apenas no 1º período. Renovação a ${Math.round(regularPriceMinor / 100)} ${currency}/mês. Cancela quando quiseres em Gerir conta.`,

  ctaActivate: (amountMinor: number, currency = "MZN") =>
    `Ativar Premium — ${Math.round(amountMinor / 100)} ${currency}`,

  dismissSoft: "Agora não",
} as const;

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0h 0m";
  const totalMin = Math.max(0, Math.floor(msLeft / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}
