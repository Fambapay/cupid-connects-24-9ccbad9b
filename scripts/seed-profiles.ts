/**
 * Seed profiles generator
 * Run with: bun run scripts/seed-profiles.ts
 *
 * Idempotent: skips profiles that already exist (matched by name + city + is_seed=true).
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Data pools ──────────────────────────────────────────────────────────────

const FEMALE_NAMES = [
  "Amélia","Fátima","Lurdes","Graça","Beatriz","Sónia","Anita","Celeste","Nádia","Rosa",
  "Esperança","Felicidade","Glória","Inocência","Joaquina","Leonor","Marcelina","Noémia",
  "Orlanda","Paulina","Querida","Regina","Sandra","Teresa","Ualda","Vitória","Xénia",
  "Yasmina","Zulmira","Aldina","Berta","Carla","Dalila","Eduarda","Filomena","Hortência",
  "Ivone","Júlia","Madalena","Natália","Liliana","Cátia","Marlene","Diana","Elisa","Helena",
  "Miriam","Nair","Olga","Priscila","Rute","Sofia","Tatiana","Vanessa","Wania","Yolanda",
  "Zara","Aisha","Belmira","Cecília","Dora","Esther","Flor","Gina","Indira","Jéssica",
  "Kátia","Lena","Marta","Neusa","Otilia","Patrícia","Quitéria","Rosa Maria","Sílvia",
  "Telma","Úrsula","Vanda","Welmira","Xica","Zenaide","Ângela","Bárbara","Cristina",
  "Dina","Elvira","Fernanda","Gorete","Henriqueta","Isabel","Joana","Kendra","Luisa",
];

const MALE_NAMES = [
  "Arnaldo","Benedito","Carlos","Domingos","Eduardo","Filipe","Gilberto","Hélder","Ivan",
  "Jaime","Kaique","Lourenço","Manuel","Nélio","Osvaldo","Pedro","Quito","Rui","Sérgio",
  "Tomás","Ulisses","Valter","Wálter","Xavier","Yuri","Zacarias","Abílio","Bruno","César","Dário",
  "Eusébio","Fernando","Gonçalo","Humberto","Inácio","Jorge","Kevin","Lázaro","Mário","Narciso",
  "Orlando","Paulo","Quintino","Rodrigo","Salvador","Teodoro","Umberto","Vicente","William",
  "Xisto","Yago","Zé","Adriano","Baltazar","Celso","Davi","Eli","Francisco","Gaspar",
  "Horácio","Ismael","José","Lucas","Martinho","Nicolau","Octávio","Patrício","Renato",
  "Simão","Tiago","Válter","Welson","Alexandre","Bento","Cândido","Daniel","Emílio",
  "Frederico","Guilherme","Henrique","Igor","Joel","Leandro","Marco","Nando","Otávio",
];

const NB_NAMES = [
  "Sami","Alex","Kim","Noa","Yan","Sasha","Mika","Rumi","Toni","Lou","Riley","Quinn",
  "Avery","Jordan","Casey","Jamie","Dakota","Skyler","Reese","Peyton","Morgan","Taylor",
  "Cameron","Drew","Kai","Jaden","Rowan","Sage","Phoenix","Charlie",
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
  "Viver é o meu desporto preferido. Bora ver para onde isto vai?",
  "Música ao vivo, jantares longos e boas memórias. É o meu vibe.",
  "Empreendedor por paixão. Procuro alguém que sonhe alto.",
  "Adoro animais, principalmente cães. Apaixonado por causas justas.",
  "Sou simples. Praia, família, amigos, boa conversa. O resto vem.",
  "Treino futebol miúdos no bairro. Vida cheia, coração aberto.",
  "Designer gráfica. Vivo entre Maputo e a Costa do Sol todos os fins-de-semana.",
  "Fanático por motas e fins-de-semana em Bilene.",
  "Adoro arte, cinema português e jantares com vinho.",
  "Estudo direito. Sou ambiciosa mas também sei descontrair.",
  "Yoga ao amanhecer, jazz à noite. Vibes positivas only.",
  "Médico interno. Procuro alguém para os meus poucos dias livres.",
  "Cozinhar é o meu amor. Quem quiser provar matapa autêntico, fala.",
  "Voluntário num orfanato. Acredito que o mundo precisa de mais carinho.",
  "Fotógrafo de casamentos. Viver de captar amor é privilégio.",
  "Adoro futebol, principalmente quando o Costa do Sol ganha.",
  "Gosto de pessoas autênticas. Sem máscaras, sem jogos.",
  "Tatuadora. A arte é a minha linguagem. Bora conversar?",
  "Adoro o silêncio do Lago Niassa e o caos de Maputo. Os dois lados.",
  "Sou pacífico mas intenso quando importa. Procuro algo verdadeiro.",
  "Educadora de infância. Os miúdos ensinaram-me a ser melhor pessoa.",
  "Empresário, pai presente, homem de família. Sem dramas.",
  "Adoro chá da tarde, conversas profundas e domingos preguiçosos.",
  "Engenheira civil. Construo pontes e relações com cuidado.",
  "Fanático por basket e séries. Procuro alguém para maratonas.",
  "Bióloga marinha. O oceano é o meu escritório.",
  "Trabalho com ONGs. Acredito que pequenas ações mudam o mundo.",
];

const INTERESTS = [
  "Música","Viagens","Culinária","Desporto","Fotografia","Leitura","Dança","Cinema",
  "Natureza","Arte","Fitness","Jogos","Moda","Tecnologia","Voluntariado",
];

const CITIES = [
  { name: "Maputo",    count: 30, lat: -25.9692, lng: 32.5732 },
  { name: "Beira",     count: 20, lat: -19.8437, lng: 34.8389 },
  { name: "Nampula",   count: 15, lat: -15.1165, lng: 39.2666 },
  { name: "Quelimane", count:  8, lat: -17.8786, lng: 36.8883 },
  { name: "Tete",      count:  7, lat: -16.1564, lng: 33.5867 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const today = new Date();
  const y = today.getFullYear() - age - (Math.random() < 0.5 ? 0 : 1);
  const m = randInt(1, 12);
  const d = randInt(1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function lastActiveRandom(): string {
  const minMs = 60 * 60 * 1000;          // 1h
  const maxMs = 3 * 24 * 60 * 60 * 1000; // 3 days
  return new Date(Date.now() - randInt(minMs, maxMs)).toISOString();
}

function jitterCoord(c: number): number {
  return c + (Math.random() - 0.5) * 0.1;
}

// Photo URL pools (no AI — real portraits + curated Unsplash lifestyle)
// randomuser.me has IDs 0-99 per gender. We track which we've used.
const usedFaceIds = { women: new Set<number>(), men: new Set<number>() };
function nextFaceUrl(gender: "feminino" | "masculino" | "nao_binario"): string {
  const bucket = gender === "masculino" ? "men" : gender === "feminino" ? "women" : (Math.random() < 0.5 ? "men" : "women");
  const used = usedFaceIds[bucket as "women" | "men"];
  let id: number;
  do { id = rand(99); } while (used.has(id) && used.size < 99);
  used.add(id);
  return `https://randomuser.me/api/portraits/${bucket}/${id}.jpg`;
}

// Curated lifestyle/landscape photos (Unsplash) — natural feel, no faces.
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
  "https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=800&q=80",
  "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&q=80",
  "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80",
  "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=800&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80",
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80",
  "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
  "https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=80",
  "https://images.unsplash.com/photo-1500522144261-ea64433bbe27?w=800&q=80",
];

function pickPhotos(gender: "feminino" | "masculino" | "nao_binario"): string[] {
  const count = randInt(3, 4);
  const out = [nextFaceUrl(gender)];
  const lifestyle = pickN(LIFESTYLE_PHOTOS, count - 1);
  return [...out, ...lifestyle];
}

// ─── Generation ─────────────────────────────────────────────────────────────

interface SeedSpec {
  gender: "feminino" | "masculino" | "nao_binario";
  ageMin: number;
  ageMax: number;
  count: number;
}

const SPECS: SeedSpec[] = [
  { gender: "feminino",    ageMin: 18, ageMax: 32, count: 40 },
  { gender: "masculino",   ageMin: 20, ageMax: 35, count: 30 },
  { gender: "nao_binario", ageMin: 19, ageMax: 30, count: 10 },
];

function namePool(gender: "feminino" | "masculino" | "nao_binario"): string[] {
  if (gender === "feminino") return FEMALE_NAMES;
  if (gender === "masculino") return MALE_NAMES;
  return [...NB_NAMES, ...FEMALE_NAMES.slice(0, 5), ...MALE_NAMES.slice(0, 5)];
}

interface Profile {
  name: string;
  gender: "feminino" | "masculino" | "nao_binario";
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

function generate(): Profile[] {
  // Build a flat allocation of (gender, city) — distribute each gender across cities proportionally.
  const profiles: Profile[] = [];
  for (const spec of SPECS) {
    // distribute spec.count across CITIES proportionally to city counts
    const totalCity = CITIES.reduce((a, c) => a + c.count, 0);
    let allocated = 0;
    const cityAlloc = CITIES.map((c, i) => {
      const n = i === CITIES.length - 1
        ? spec.count - allocated
        : Math.round((c.count / totalCity) * spec.count);
      allocated += n;
      return { city: c, n };
    });

    const names = [...namePool(spec.gender)];
    for (const { city, n } of cityAlloc) {
      for (let i = 0; i < n; i++) {
        // pick a name; if pool depleted, reset (allows mild duplication across cities)
        if (!names.length) names.push(...namePool(spec.gender));
        const name = names.splice(rand(names.length), 1)[0];
        const age = randInt(spec.ageMin, spec.ageMax);
        profiles.push({
          name,
          gender: spec.gender,
          age,
          birthdate: birthdateFromAge(age),
          city: city.name,
          country: "Moçambique",
          latitude: jitterCoord(city.lat),
          longitude: jitterCoord(city.lng),
          bio: pick(BIOS),
          interests: pickN(INTERESTS, randInt(2, 4)),
          photos: pickPhotos(spec.gender),
          last_active_at: lastActiveRandom(),
        });
      }
    }
  }
  return profiles;
}

// ─── Insertion ──────────────────────────────────────────────────────────────

async function insertProfile(p: Profile, idx: number, total: number) {
  // Check idempotency
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("name", p.name)
    .eq("city", p.city)
    .eq("is_seed", true)
    .maybeSingle();

  if (existing) {
    console.log(`[${idx}/${total}] SKIP ${p.name}, ${p.city} (already exists)`);
    return;
  }

  // Create an auth user (profiles.id has a FK to auth.users.id).
  // Email is deterministic so re-runs hit the same user.
  const slug = `${p.name}-${p.city}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");
  const email = `seed-${slug}@seeds.hunie.local`;
  const { data: userRes, error: uErr } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { is_seed: true, name: p.name },
  });
  if (uErr) {
    console.error(`[${idx}/${total}] AUTH ERROR ${p.name}, ${p.city}:`, uErr.message);
    return;
  }
  const id = userRes.user!.id;

  // The handle_new_user trigger may have already created a profile row; update instead of insert.
  const profilePayload = {
    name: p.name,
    age: p.age,
    birthdate: p.birthdate,
    city: p.city,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    bio: p.bio,
    gender: p.gender,
    interests: p.interests,
    interested_in: [],
    is_verified: true,
    is_paused: false,
    is_incognito: false,
    membership_tier: "free",
    membership_status: "inactive",
    onboarding_completed: true,
    onboarding_step: 99,
    is_seed: true,
    seed_active: true,
    last_active_at: p.last_active_at,
  };

  const { error: pErr } = await sb
    .from("profiles")
    .upsert({ id, ...profilePayload }, { onConflict: "id" });

  if (pErr) {
    console.error(`[${idx}/${total}] ERROR ${p.name}, ${p.city}:`, pErr.message);
    return;
  }

  const photoRows = p.photos.map((url, i) => ({
    profile_id: id,
    storage_path: url,
    position: i,
  }));
  const { error: phErr } = await sb.from("profile_photos").insert(photoRows);
  if (phErr) {
    console.error(`[${idx}/${total}] PHOTO ERROR ${p.name}:`, phErr.message);
  }

  console.log(`[${idx}/${total}] Inserted ${p.name} (${p.gender}, ${p.age}, ${p.city})`);
}

async function main() {
  const profiles = generate();
  console.log(`Generated ${profiles.length} profiles. Starting insert...\n`);
  let i = 0;
  for (const p of profiles) {
    i++;
    await insertProfile(p, i, profiles.length);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
