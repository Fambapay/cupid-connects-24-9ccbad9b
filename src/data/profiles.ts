import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import p5 from "@/assets/p5.jpg";
import p6 from "@/assets/p6.jpg";

export type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  photo: string;
  interests: string[];
};

export const profiles: Profile[] = [
  {
    id: "1",
    name: "Mila",
    age: 24,
    bio: "Apaixonada por vinho, arquitetura e viagens.",
    distance: "Maastricht",
    photo: p1,
    interests: ["Vinho", "Arquitetura", "Viagens"],
  },
  {
    id: "2",
    name: "Lucas",
    age: 29,
    bio: "Designer, surfista e amante de viagens curtas.",
    distance: "Lisboa",
    photo: p2,
    interests: ["Surf", "Viagens", "Design"],
  },
  {
    id: "3",
    name: "Marina",
    age: 24,
    bio: "Vivendo um dia de cada vez, normalmente com música alta.",
    distance: "Porto",
    photo: p3,
    interests: ["Música", "Praia", "Cachorros"],
  },
  {
    id: "4",
    name: "Diego",
    age: 27,
    bio: "Cinéfilo de carteirinha. Indica um filme e eu vou.",
    distance: "Madrid",
    photo: p4,
    interests: ["Cinema", "Pizza", "Games"],
  },
  {
    id: "5",
    name: "Aiko",
    age: 25,
    bio: "Engenheira de dia, ilustradora de noite.",
    distance: "Barcelona",
    photo: p5,
    interests: ["Tech", "Arte", "Matchá"],
  },
  {
    id: "6",
    name: "Isabela",
    age: 28,
    bio: "Trilhas no fim de semana, vinho na sexta.",
    distance: "Amsterdam",
    photo: p6,
    interests: ["Trilhas", "Vinho", "Fotografia"],
  },
];

export type Match = {
  id: string;
  profileId: string;
  lastMessage: string;
  time: string;
  unread: number;
};

export const matches: Match[] = [
  { id: "m1", profileId: "1", lastMessage: "Adorei sua foto na praia!", time: "agora", unread: 2 },
  { id: "m2", profileId: "3", lastMessage: "Vamos marcar aquele café?", time: "5 min", unread: 1 },
  { id: "m3", profileId: "5", lastMessage: "kkkk concordo demais", time: "2 h", unread: 0 },
  { id: "m4", profileId: "6", lastMessage: "Eu também amo trilhas 🥾", time: "ontem", unread: 0 },
];

export type Message = {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
};

export const conversations: Record<string, Message[]> = {
  m1: [
    { id: "1", text: "Oii! Tudo bem? 👋", fromMe: false, time: "10:02" },
    { id: "2", text: "Oii Mila! Tudo ótimo, e você?", fromMe: true, time: "10:05" },
    { id: "3", text: "Tudo lindo por aqui ✨", fromMe: false, time: "10:06" },
    { id: "4", text: "Adorei sua foto na praia!", fromMe: false, time: "10:07" },
  ],
  m2: [
    { id: "1", text: "Vamos marcar aquele café?", fromMe: false, time: "09:30" },
  ],
  m3: [
    { id: "1", text: "Você viu o show ontem?", fromMe: true, time: "20:00" },
    { id: "2", text: "kkkk concordo demais", fromMe: false, time: "20:02" },
  ],
  m4: [
    { id: "1", text: "Eu também amo trilhas 🥾", fromMe: false, time: "ontem" },
  ],
};

export function getProfile(id: string) {
  return profiles.find((p) => p.id === id);
}

// Simple subscription so route components can re-render when matches/conversations change.
const listeners = new Set<() => void>();
export function subscribeMatches(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

export function promoteNewMatch(matchId: string, profileId: string, firstMessage: Message) {
  const existing = matches.find((m) => m.id === matchId);
  if (!existing) {
    matches.unshift({
      id: matchId,
      profileId,
      lastMessage: firstMessage.text,
      time: firstMessage.time,
      unread: 0,
    });
  }
  conversations[matchId] = [...(conversations[matchId] ?? []), firstMessage];
  emit();
}

export function appendMessage(matchId: string, message: Message) {
  conversations[matchId] = [...(conversations[matchId] ?? []), message];
  const m = matches.find((x) => x.id === matchId);
  if (m) {
    m.lastMessage = message.text;
    m.time = message.time;
  }
  emit();
}

