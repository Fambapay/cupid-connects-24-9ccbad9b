import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

export function setDiscoveryDetailOpen(v: boolean) {
  if (open === v) return;
  open = v;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return open;
}

function getServerSnapshot() {
  return false;
}

export function useDiscoveryDetailOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
