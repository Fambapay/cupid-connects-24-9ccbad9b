export type SwipeDirection = "left" | "right" | "up";

export interface DiscoveryProfile {
  id: string;
  name: string;
  age: number;
  city?: string;
  distance?: number; // meters
  bio?: string;
  photos: string[];
  interests?: string[];
  isOnline?: boolean;
  isVerified?: boolean;
  isPremium?: boolean;
  heightCm?: number | null;
  lookingFor?: string | null;
  pets?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  workout?: string | null;
}

export interface DailyLimits {
  likesUsed: number;
  likesLimit: number;
  superLikesUsed: number;
  superLikesLimit: number;
}
