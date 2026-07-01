// Shared PT-PT labels for lifestyle profile fields.

export const LOOKING_FOR_LABELS: Record<string, string> = {
  short_term: "Curto prazo",
  long_term: "Longo prazo",
  friendship: "Amizade",
  undecided: "A descobrir",
};

export const PETS_LABELS: Record<string, string> = {
  dog: "Cão",
  cat: "Gato",
  both: "Cão e gato",
  other: "Outro",
  none: "Sem animais",
};

export const SMOKING_LABELS: Record<string, string> = {
  never: "Não fumo",
  social: "Socialmente",
  regular: "Regularmente",
  quitting: "A tentar parar",
};

export const DRINKING_LABELS: Record<string, string> = {
  never: "Não bebo",
  social: "Socialmente",
  regular: "Regularmente",
  sober: "Sóbrio/a",
};

export const WORKOUT_LABELS: Record<string, string> = {
  never: "Nunca",
  sometimes: "Às vezes",
  often: "Muitas vezes",
  daily: "Todos os dias",
};

export const LIFESTYLE_OPTIONS = {
  looking_for: LOOKING_FOR_LABELS,
  pets: PETS_LABELS,
  smoking: SMOKING_LABELS,
  drinking: DRINKING_LABELS,
  workout: WORKOUT_LABELS,
} as const;

export type LifestyleKey = keyof typeof LIFESTYLE_OPTIONS;

export function formatHeight(cm?: number | null): string {
  if (!cm || cm <= 0) return "";
  return `${cm} cm`;
}
