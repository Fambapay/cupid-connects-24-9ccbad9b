import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type Seed = {
  name: string; age: number; city: string; gender: "feminino" | "masculino";
  bio: string; interests: string[]; photos: string[];
};

const SEEDS: Seed[] = [
  { name: "Sanne", age: 26, city: "Amesterdão", gender: "feminino", bio: "Adoro bicicletas, café e canais ao pôr-do-sol.", interests: ["viagens","café","arte"], photos: ["https://randomuser.me/api/portraits/women/12.jpg","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80"] },
  { name: "Lieke", age: 29, city: "Amesterdão", gender: "feminino", bio: "Designer holandesa apaixonada por cozinha portuguesa.", interests: ["design","culinária","música"], photos: ["https://randomuser.me/api/portraits/women/22.jpg","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80","https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80"] },
  { name: "Anouk", age: 24, city: "Roterdão", gender: "feminino", bio: "Arquitetura, livros e fins-de-semana em Lisboa.", interests: ["leitura","arquitetura"], photos: ["https://randomuser.me/api/portraits/women/33.jpg","https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80","https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&q=80"] },
  { name: "Eva", age: 31, city: "Haia", gender: "feminino", bio: "Praia de Scheveningen e jantares longos.", interests: ["praia","vinho"], photos: ["https://randomuser.me/api/portraits/women/44.jpg","https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&q=80","https://images.unsplash.com/photo-1521252659862-eec69941b071?w=800&q=80"] },
  { name: "Mariana", age: 27, city: "Amesterdão", gender: "feminino", bio: "Mestrado em Amesterdão, raízes em Maputo.", interests: ["fotografia","dança"], photos: ["https://randomuser.me/api/portraits/women/55.jpg","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80","https://images.unsplash.com/photo-1542596594-649edbc13630?w=800&q=80"] },
  { name: "Fenna", age: 25, city: "Utrecht", gender: "feminino", bio: "Yoga, brunch e road trips pelos Países Baixos.", interests: ["yoga","viagens"], photos: ["https://randomuser.me/api/portraits/women/66.jpg","https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80","https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=800&q=80"] },
  { name: "Daan", age: 30, city: "Amesterdão", gender: "masculino", bio: "Engenheiro a viver entre Amesterdão e a Beira.", interests: ["tecnologia","corrida"], photos: ["https://randomuser.me/api/portraits/men/12.jpg","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80"] },
  { name: "Sven", age: 28, city: "Roterdão", gender: "masculino", bio: "Fotógrafo. Procuro alguém para explorar a cidade.", interests: ["fotografia","cinema"], photos: ["https://randomuser.me/api/portraits/men/24.jpg","https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=80","https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=80"] },
  { name: "Bruno NL", age: 33, city: "Haia", gender: "masculino", bio: "Moçambicano em Haia, fã de surf e Tofo.", interests: ["surf","viagens"], photos: ["https://randomuser.me/api/portraits/men/36.jpg","https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"] },
  { name: "Lucas", age: 27, city: "Utrecht", gender: "masculino", bio: "Café especial, vinis e bicicleta todos os dias.", interests: ["café","música"], photos: ["https://randomuser.me/api/portraits/men/48.jpg","https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80","https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80"] },
  { name: "Thijs", age: 31, city: "Amesterdão", gender: "masculino", bio: "Chef num bistro do Jordaan. Cozinho para a primeira data.", interests: ["culinária","vinho"], photos: ["https://randomuser.me/api/portraits/men/57.jpg","https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&q=80","https://images.unsplash.com/photo-1517630800677-932d836ab680?w=800&q=80"] },
  { name: "Joao NL", age: 29, city: "Roterdão", gender: "masculino", bio: "Português a viver em Roterdão, sempre a viajar.", interests: ["viagens","futebol"], photos: ["https://randomuser.me/api/portraits/men/68.jpg","https://images.unsplash.com/photo-1502764613149-7f1d229e230f?w=800&q=80","https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80"] },
];

function bd(age: number) {
  const y = new Date().getFullYear() - age;
  return `${y}-06-15`;
}

for (const s of SEEDS) {
  const exists = await sb.from("profiles").select("id").eq("name", s.name).eq("city", s.city).eq("is_seed", true).maybeSingle();
  if (exists.data) { console.log("SKIP", s.name, s.city); continue; }
  const slug = `${s.name}-${s.city}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");
  const email = `seed-${slug}@seeds.hunie.local`;
  const u = await sb.auth.admin.createUser({ email, email_confirm: true, password: crypto.randomUUID(), user_metadata: { is_seed: true, name: s.name } });
  if (u.error) { console.error("AUTH", s.name, u.error.message); continue; }
  const id = u.data.user!.id;
  const interested_in = s.gender === "feminino" ? ["masculino"] : ["feminino"];
  const { error: pErr } = await sb.from("profiles").upsert({
    id, name: s.name, age: s.age, birthdate: bd(s.age), city: s.city, country: "Holanda",
    bio: s.bio, gender: s.gender, interests: s.interests, interested_in,
    is_verified: true, is_paused: false, is_incognito: false,
    membership_tier: "free", membership_status: "inactive",
    onboarding_completed: true, onboarding_step: 99, is_seed: true, seed_active: true,
    last_active_at: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString(),
  }, { onConflict: "id" });
  if (pErr) { console.error("PROF", s.name, pErr.message); continue; }
  const ph = await sb.from("profile_photos").insert(s.photos.map((url, i) => ({ profile_id: id, storage_path: url, position: i })));
  if (ph.error) console.error("PHOTO", s.name, ph.error.message);
  console.log("OK", s.name, s.city);
}
