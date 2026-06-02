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
}

export interface DailyLimits {
  likesUsed: number;
  likesLimit: number;
  superLikesUsed: number;
  superLikesLimit: number;
}
