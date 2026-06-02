export interface CompletionInput {
  photosCount: number;
  bio?: string | null;
  interests?: string[] | null;
  city?: string | null;
  isVerified?: boolean | null;
}

export const computeProfileCompletion = ({
  photosCount,
  bio,
  interests,
  city,
  isVerified,
}: CompletionInput): number => {
  const interestsCount = interests?.length ?? 0;
  let score = 0;
  if (photosCount >= 1) score += 25;
  if (photosCount >= 3) score += 10;
  if (bio && bio.trim().length > 0) score += 20;
  if (interestsCount >= 1) score += 10;
  if (interestsCount >= 3) score += 10;
  if (city && city.trim().length > 0) score += 15;
  if (isVerified) score += 10;
  return Math.min(100, score);
};
