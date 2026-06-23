// Springs que espelham as named springs do iOS / SwiftUI — o "Apple feel".
export const spring = {
  smooth: { type: "spring", visualDuration: 0.45, bounce: 0 },
  snappy: { type: "spring", visualDuration: 0.4,  bounce: 0.18 },
  bouncy: { type: "spring", visualDuration: 0.5,  bounce: 0.32 },
  micro:  { type: "spring", visualDuration: 0.18, bounce: 0.15 },
  sheet:  { type: "spring", visualDuration: 0.5,  bounce: 0.12 },
} as const;

export const fade = {
  initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
};

export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: spring.snappy },
  },
};

/**
 * iOS push-navigation variants for the screen that ENTERS (drill-in).
 *
 * The screen that's LEFT BEHIND should animate in parallel from x: 0 →
 * "-30%" with `spring.smooth` AND a black overlay should fade 0 → 0.18
 * over the top. Don't use filter:brightness — an overlay div is just a
 * compositor pass and is much smoother on mobile.
 */
export const pushScreen = {
  initial: { x: "100%" },
  animate: { x: 0,      transition: spring.smooth },
  exit:    { x: "100%", transition: spring.smooth },
};

/** Companion variants for the back screen during a push (parallax recede). */
export const pushScreenBehind = {
  initial: { x: 0 },
  animate: { x: "-30%", transition: spring.smooth },
  exit:    { x: 0,      transition: spring.smooth },
};

/** Companion variants for the black overlay over the back screen. */
export const pushScreenOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 0.18, transition: spring.smooth },
  exit:    { opacity: 0,    transition: spring.smooth },
};

/**
 * Tunables para o swipe deck (Tinder-like).
 * Usar com `animate(x, ...)` / `animate(y, ...)` + velocity handoff.
 */
export const swipe = {
  commitOffset: 0.35,   // fracção da largura do ecrã para confirmar
  commitVelocity: 500,  // px/s — flick confirma sem distância
  maxRotate: 16,        // graus no extremo do drag
  flyDistance: 1.5,     // múltiplo da largura para sair de cena
} as const;

/**
 * Tunables para o ecrã "It's a Match".
 * O `photoSettle` é o overshoot que dá o batimento emocional ao encontro
 * das duas fotos; o `titlePop` é o bounce mais marcado do título.
 */
export const match = {
  photoSettle: { type: "spring", visualDuration: 0.55, bounce: 0.22 },
  titlePop:    { type: "spring", visualDuration: 0.5,  bounce: 0.35 },
  photoOverlap: 24, // px de sobreposição quando as fotos assentam
} as const;

/**
 * Tunables para o chat (iMessage-style — function-first, discreto).
 * `bubbleIn` aplica-se a mensagens NOVAS (durante a sessão), nunca ao
 * histórico já carregado no primeiro paint — senão a lista "explode" ao abrir.
 */
export const chat = {
  bubbleIn:  { type: "spring", visualDuration: 0.32, bounce: 0.12 },
  sentNudge: 700, // velocidade sintética do "empurrão" ao enviar
} as const;

/**
 * Tunables para listas — Fase 5.
 * `revealStagger` curto: o olho lê "lista entrou com vida", não
 * "itens entraram um a um". Stagger lento parece PowerPoint.
 */
export const list = {
  revealStagger: 0.04,
  rowPress: { type: "spring", visualDuration: 0.16, bounce: 0.1 },
} as const;

