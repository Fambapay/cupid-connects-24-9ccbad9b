// Server-only seed data pools and builder. Never imported from client modules
// (handler-side dynamic import only).

const FEMALE_NAMES = [
  "Amélia","Fátima","Lurdes","Graça","Beatriz","Sónia","Anita","Celeste","Nádia","Rosa",
  "Esperança","Felicidade","Glória","Inocência","Joaquina","Leonor","Marcelina","Noémia",
  "Orlanda","Paulina","Querida","Regina","Sandra","Teresa","Ualda","Vitória","Xénia",
  "Yasmina","Zulmira","Aldina","Berta","Carla","Dalila","Eduarda","Filomena","Hortência",
  "Ivone","Júlia","Madalena","Natália","Liliana","Cátia","Marlene","Diana","Elisa","Helena",
  "Miriam","Nair","Olga","Priscila","Rute","Sofia","Tatiana","Vanessa","Wania","Yolanda",
  "Zara","Aisha","Belmira","Cecília","Dora","Esther","Flor","Gina","Indira","Jéssica",
];

const MALE_NAMES = [
  "Arnaldo","Benedito","Carlos","Domingos","Eduardo","Filipe","Gilberto","Hélder","Ivan",
  "Jaime","Kaique","Lourenço","Manuel","Nélio","Osvaldo","Pedro","Quito","Rui","Sérgio",
  "Tomás","Ulisses","Valter","Wálter","Xavier","Yuri","Zacarias","Abílio","Bruno","César","Dário",
  "Eusébio","Fernando","Gonçalo","Humberto","Inácio","Jorge","Kevin","Lázaro","Mário","Narciso",
  "Orlando","Paulo","Quintino","Rodrigo","Salvador","Teodoro","Umberto","Vicente","William",
];

const NB_NAMES = [
  "Sami","Alex","Kim","Noa","Yan","Sasha","Mika","Rumi","Toni","Lou","Riley","Quinn",
  "Avery","Jordan","Casey","Jamie","Dakota","Skyler","Reese","Peyton","Morgan","Taylor",
];

const BIOS = [
  "Adoro o pôr do sol na Polana. Procuro alguém com quem rir sem parar.",
  "Chef amador, fanático de futebol. A vida é boa quando partilhada.",
  "Viajo sempre que posso. Maputo é casa, mas o mundo é grande demais.",
  "Psicologia e música são as minhas paixões. E um bom matapa ao domingo.",
  "Professora de dia, dançarina de fim de semana. Sempre bem-disposta.",
  "Amo a natureza, trilhos e conversas que duram até de manhã.",
  "Café, livros e praia. Não preciso de muito mais.",
  "Fotografia é o meu vício. Adoro registar a alma das pessoas.",
  "Engenheiro a tempo inteiro, surfista nos fins-de-semana em Tofo.",
  "Estudante de medicina. Procuro algo real, sem pressa.",
  "Apaixonada por gastronomia africana. Vamos cozinhar juntos?",
  "Acredito que rir é o melhor remédio. E que xima com caril cura tudo.",
  "Mãe solteira, mulher inteira. À procura de alguém genuíno.",
  "Designer gráfica. Vivo entre Maputo e a Costa do Sol.",
  "Adoro arte, cinema português e jantares com vinho.",
  "Yoga ao amanhecer, jazz à noite. Vibes positivas only.",
  "Cozinhar é o meu amor. Quem quiser provar matapa autêntico, fala.",
  "Fotógrafo de casamentos. Viver de captar amor é privilégio.",
  "Gosto de pessoas autênticas. Sem máscaras, sem jogos.",
  "Engenheira civil. Construo pontes e relações com cuidado.",
];

const INTERESTS = [
  "Música","Viagens","Culinária","Desporto","Fotografia","Leitura","Dança","Cinema",
  "Natureza","Arte","Fitness","Jogos","Moda","Tecnologia","Voluntariado",
];

const LIFESTYLE_PHOTOS = [
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  "https://images.unsplash.com/photo-1496950866446-3253e1470e8e?w=800&q=80",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80",
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=800&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=800&q=80",
];

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Maputo: { lat: -25.9692, lng: 32.5732 },
  Matola: { lat: -25.9622, lng: 32.4589 },
  Beira: { lat: -19.8437, lng: 34.8389 },
  Nampula: { lat: -15.1165, lng: 39.2666 },
  Quelimane: { lat: -17.8786, lng: 36.8883 },
  Tete: { lat: -16.1564, lng: 33.5867 },
};

type Gender = "feminino" | "masculino" | "nao_binario";

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(rand(copy.length), 1)[0]);
  return out;
};
const randInt = (min: number, max: number) => min + rand(max - min + 1);

function birthdateFromAge(age: number): string {
  const y = new Date().getFullYear() - age - (Math.random() < 0.5 ? 0 : 1);
  const m = randInt(1, 12);
  const d = randInt(1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function lastActiveRandom(): string {
  const minMs = 60 * 60 * 1000;
  const maxMs = 3 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - randInt(minMs, maxMs)).toISOString();
}

function jitter(c: number): number {
  return c + (Math.random() - 0.5) * 0.1;
}

function faceUrl(gender: Gender): string {
  const bucket = gender === "masculino" ? "men" : gender === "feminino" ? "women" : Math.random() < 0.5 ? "men" : "women";
  return `https://randomuser.me/api/portraits/${bucket}/${rand(99)}.jpg`;
}

function pickPhotos(gender: Gender): string[] {
  const count = randInt(3, 4);
  return [faceUrl(gender), ...pickN(LIFESTYLE_PHOTOS, count - 1)];
}

function namePool(gender: Gender): string[] {
  if (gender === "feminino") return FEMALE_NAMES;
  if (gender === "masculino") return MALE_NAMES;
  return NB_NAMES;
}

export interface SeedProfile {
  name: string;
  gender: Gender;
  age: number;
  birthdate: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  bio: string;
  interests: string[];
  photos: string[];
  last_active_at: string;
}

export function buildSeedProfiles(args: {
  city: string;
  count: number;
  gender: Gender;
  ageMin?: number;
  ageMax?: number;
}): SeedProfile[] {
  const coords = CITY_COORDS[args.city] ?? CITY_COORDS.Maputo;
  const pool = namePool(args.gender);
  const ageMin = args.ageMin ?? (args.gender === "masculino" ? 20 : 18);
  const ageMax = args.ageMax ?? (args.gender === "masculino" ? 38 : 35);
  const out: SeedProfile[] = [];
  for (let i = 0; i < args.count; i++) {
    const age = randInt(ageMin, ageMax);
    out.push({
      name: pick(pool),
      gender: args.gender,
      age,
      birthdate: birthdateFromAge(age),
      city: args.city,
      country: "Moçambique",
      latitude: jitter(coords.lat),
      longitude: jitter(coords.lng),
      bio: pick(BIOS),
      interests: pickN(INTERESTS, randInt(3, 6)),
      photos: pickPhotos(args.gender),
      last_active_at: lastActiveRandom(),
    });
  }
  return out;
}
