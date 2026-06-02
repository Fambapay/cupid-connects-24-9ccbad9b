export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  country: LusophoneCountry;
  distance: number; // in km
  bio: string;
  photos: string[];
  gender: 'masculino' | 'feminino';
  lookingFor: 'masculino' | 'feminino' | 'ambos';
  interests?: string[];
  isOnline?: boolean;
  lastSeenAt?: string;
  // Extended profile info
  hobbies?: string[];
  favoriteMovies?: string[];
  lookingForType?: string; // What they're looking for in the app
  height?: number; // cm
  job?: string;
  education?: string;
  is_premium?: boolean; // Premium subscription status
  is_verified?: boolean; // Verification status
  hasSuperLikedMe?: boolean; // Other person already gave a Super Like
}

export interface Match {
  id: string;
  matchedAt: Date;
  profile: Profile;
  lastMessage?: Message;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  matchId: string;
  messages: Message[];
}

export type LusophoneCountry =
  | 'Moçambique'
  | 'Angola'
  | 'Brasil'
  | 'Portugal'
  | 'Cabo Verde'
  | 'Guiné-Bissau'
  | 'São Tomé e Príncipe'
  | 'Timor-Leste'
  | 'Holanda';

export interface Filters {
  ageMin: number;
  ageMax: number;
  distance: number;
  gender: 'masculino' | 'feminino' | 'ambos';
  country?: LusophoneCountry;
}

export type SwipeDirection = 'left' | 'right' | 'up';
