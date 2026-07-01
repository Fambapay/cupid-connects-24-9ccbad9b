// Shared PT labels for lifestyle profile fields.
// Tom: português fluido, natural, com leveza — sem gírias nem calões.

export const LOOKING_FOR_LABELS: Record<string, string> = {
  short_term: "Algo leve",
  long_term: "Algo sério",
  friendship: "Fazer amigos",
  undecided: "Ainda a descobrir",
};

export const PETS_LABELS: Record<string, string> = {
  dog: "Tenho cão",
  cat: "Tenho gato",
  both: "Cão e gato",
  other: "Outro bicho",
  none: "Sem animais",
};

export const SMOKING_LABELS: Record<string, string> = {
  never: "Não fumo",
  social: "Só em ocasiões",
  regular: "Com frequência",
  quitting: "A largar",
};

export const DRINKING_LABELS: Record<string, string> = {
  never: "Não bebo",
  social: "Um copo aqui e ali",
  regular: "Com frequência",
  sober: "Sóbrio por escolha",
};

export const WORKOUT_LABELS: Record<string, string> = {
  never: "Não treino",
  sometimes: "De vez em quando",
  often: "Quase sempre",
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
