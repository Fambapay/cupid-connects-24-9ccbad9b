// Motor central de ofertas.
// - Consulta get_eligible_offer no servidor (nunca decide sozinho quem vê o quê).
// - Enfileira gatilhos e só os mostra em transições seguras (nunca durante swipe/chat/teclado).
// - Regista impressões/dismissals/clicks.

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMatchRoute } from "@tanstack/react-router";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import {
  getEligibleOffer,
  getOfferPreview,
  logPopupImpression,
  type OfferDTO,
  type OfferTrigger,
} from "@/lib/offers.functions";

// Flag global usada pelos gestures de swipe para bloquear pop-ups a meio do gesto.
declare global {
  interface Window {
    __hunieSwipeActive?: boolean;
    __hunieKeyboardOpen?: boolean;
  }
}

// Local guards 1x/dia por user para triggers contextuais.
const DAILY_GUARDS: Record<string, string> = {
  likes_received: "hunie:offer:likes_received:lastShown",
  out_of_likes: "hunie:offer:out_of_likes:lastShown",
  likes_teaser: "hunie:offer:likes_teaser:lastShown",
};

function canTriggerToday(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = window.localStorage.getItem(key);
    if (!last) return true;
    const lastDate = new Date(last);
    const today = new Date();
    return (
      lastDate.getUTCFullYear() !== today.getUTCFullYear() ||
      lastDate.getUTCMonth() !== today.getUTCMonth() ||
      lastDate.getUTCDate() !== today.getUTCDate()
    );
  } catch {
    return true;
  }
}

function markTriggeredToday(key: string) {
  try {
    window.localStorage.setItem(key, new Date().toISOString());
  } catch {
    // ignore
  }
}


function isSafeToShowNow(matchChat: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (window.__hunieSwipeActive) return false;
  if (window.__hunieKeyboardOpen) return false;
  // Nunca dentro de uma conversa aberta.
  if (matchChat) return false;
  return true;
}

export function useOfferEngine() {
  const { hasPremiumAccess, isTrialing, trialDaysLeft, subscription } = useSubscription();
  const { profile } = useProfile();
  const fetchOffer = useServerFn(getEligibleOffer);
  const logImpression = useServerFn(logPopupImpression);
  const fetchOfferPreview = useServerFn(getOfferPreview);
  const matchRoute = useMatchRoute();
  const insideChat = matchRoute({ to: "/chat/$matchId" });

  const [activeOffer, setActiveOffer] = useState<OfferDTO | null>(null);
  const queueRef = useRef<OfferTrigger[]>([]);
  const inflightRef = useRef(false);
  const lastShownIdRef = useRef<string | null>(null);

  const showOfferForTrigger = useCallback(
    async (trigger: OfferTrigger) => {
      if (hasPremiumAccess && trigger !== "always_on") return null;
      if (inflightRef.current) return null;
      inflightRef.current = true;
      try {
        const offer = await fetchOffer({ data: { trigger } });
        if (!offer) return null;
        if (offer.id === lastShownIdRef.current) return null; // guard duplicados
        setActiveOffer(offer);
        lastShownIdRef.current = offer.id;
        // Fire-and-forget impressão.
        logImpression({ data: { offer_id: offer.id, action: "shown" } }).catch(() => {});
        return offer;
      } finally {
        inflightRef.current = false;
      }
    },
    [fetchOffer, hasPremiumAccess, logImpression],
  );

  const processQueue = useCallback(async () => {
    if (activeOffer) return;
    if (!isSafeToShowNow(insideChat)) return;
    const next = queueRef.current.shift();
    if (!next) return;
    await showOfferForTrigger(next);
  }, [activeOffer, insideChat, showOfferForTrigger]);

  const enqueueTrigger = useCallback(
    (trigger: OfferTrigger) => {
      if (hasPremiumAccess && trigger !== "always_on") return;
      if (queueRef.current.includes(trigger)) return;
      queueRef.current.push(trigger);
      // Tenta processar já; se o momento não for seguro, fica em fila.
      void processQueue();
    },
    [hasPremiumAccess, processQueue],
  );

  const dismissOffer = useCallback(async () => {
    const offer = activeOffer;
    setActiveOffer(null);
    if (offer) {
      logImpression({ data: { offer_id: offer.id, action: "dismissed" } }).catch(() => {});
    }
    // Ao fechar, tenta ver se há outro gatilho na fila.
    setTimeout(() => void processQueue(), 250);
  }, [activeOffer, logImpression, processQueue]);

  const claimOffer = useCallback(() => {
    const offer = activeOffer;
    if (offer) {
      logImpression({ data: { offer_id: offer.id, action: "clicked_cta" } }).catch(() => {});
    }
  }, [activeOffer, logImpression]);

  const closeAfterClaim = useCallback(() => {
    setActiveOffer(null);
  }, []);

  // Preview/debug: força mostrar o pop-up de uma oferta sem passar por elegibilidade.
  const forceShowOffer = useCallback(
    async (trigger: OfferTrigger) => {
      const offer = await fetchOfferPreview({ data: { trigger } });
      if (offer) setActiveOffer(offer);
    },
    [fetchOfferPreview],
  );

  // Auto-triggers com base no estado do trial.
  useEffect(() => {
    if (hasPremiumAccess === false || !profile) return;
    // Não dispara comercial no dia 1 do trial.
    if (isTrialing) {
      if (trialDaysLeft <= 1) {
        enqueueTrigger("trial_last_24h");
      } else if (trialDaysLeft === 2 || trialDaysLeft === 1) {
        // trialDaysLeft = 2 → estamos no dia 2 (3 dias, resta 1 pós-hoje).
        // Deixamos o RPC decidir se ainda é elegível.
        enqueueTrigger("trial_day_2");
      }
    }
    // Locked: sem pop-ups automáticos aqui — vêm via deep link do push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isTrialing, trialDaysLeft]);

  // Sempre que o contexto muda (rota, focus), tenta drenar a fila.
  useEffect(() => {
    void processQueue();
  }, [processQueue]);

  // "post_first_match" — chamado externamente pelo MatchOverlay.onClose.
  const triggerPostFirstMatch = useCallback(() => {
    if (isTrialing && trialDaysLeft >= 2) return; // Dia 1 é silêncio.
    enqueueTrigger("post_first_match");
  }, [enqueueTrigger, isTrialing, trialDaysLeft]);

  // "likes_received" — chamado quando temos ≥3 likes por ver.
  const triggerLikesReceived = useCallback(() => {
    if (isTrialing && trialDaysLeft >= 2) return;
    if (!canTriggerToday(DAILY_GUARDS.likes_received)) return;
    markTriggeredToday(DAILY_GUARDS.likes_received);
    enqueueTrigger("likes_received");
  }, [enqueueTrigger, isTrialing, trialDaysLeft]);

  // "out_of_likes" — Free bateu no cap diário de likes.
  const triggerOutOfLikes = useCallback(() => {
    if (!canTriggerToday(DAILY_GUARDS.out_of_likes)) return;
    markTriggeredToday(DAILY_GUARDS.out_of_likes);
    enqueueTrigger("out_of_likes");
  }, [enqueueTrigger]);

  // "likes_teaser" — tocou num perfil borrado em "quem gostou de mim".
  const triggerLikesTeaser = useCallback(() => {
    if (!canTriggerToday(DAILY_GUARDS.likes_teaser)) return;
    markTriggeredToday(DAILY_GUARDS.likes_teaser);
    enqueueTrigger("likes_teaser");
  }, [enqueueTrigger]);


  return {
    activeOffer,
    subscription,
    dismissOffer,
    claimOffer,
    closeAfterClaim,
    enqueueTrigger,
    triggerPostFirstMatch,
    triggerLikesReceived,
    triggerOutOfLikes,
    triggerLikesTeaser,
    forceShowOffer,
  };
}
