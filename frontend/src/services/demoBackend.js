// In-browser stand-in for the RabbitMQ/PHP/MySQL backend, used when the app is built or run
// with VITE_DEMO=true (`npm run demo`). It answers the same request.* messages with realistic
// sample data so the whole site can be explored, designed and demoed without any servers.
// It is never included in a normal build (see messaging.js).

const PHOTO = "https://images.dog.ceo/breeds";

const SHELTERS = [
  { shelter_id: 1, name: "Hudson Valley Humane Society", city: "Newark", state: "NJ", zip: "07102", latitude: 40.7357, longitude: -74.1724, phone: "(973) 555-0142", email: "adopt@hvhs.org", website: "https://example.org", description: "A volunteer-run rescue placing dogs from overcrowded shelters into loving homes since 1998." },
  { shelter_id: 2, name: "Jersey Shore Animal Rescue", city: "Asbury Park", state: "NJ", zip: "07712", latitude: 40.2204, longitude: -74.0121, phone: "(732) 555-0187", email: "hello@jsar.org", website: "https://example.org", description: "Foster-based rescue specialising in senior dogs and dogs with medical needs." },
  { shelter_id: 3, name: "Brooklyn Paws Collective", city: "Brooklyn", state: "NY", zip: "11201", latitude: 40.6943, longitude: -73.9903, phone: "(718) 555-0199", email: "team@brooklynpaws.org", website: "https://example.org", description: "Urban rescue focused on apartment-ready companions and first-time adopters." },
  { shelter_id: 4, name: "Garden State Greyhound & Hound", city: "Princeton", state: "NJ", zip: "08540", latitude: 40.3573, longitude: -74.6672, phone: "(609) 555-0133", email: "info@gshound.org", website: "https://example.org", description: "Hounds of every shape — from retired racers to basset buddies." },
  { shelter_id: 5, name: "Philly Second Chance Dogs", city: "Philadelphia", state: "PA", zip: "19103", latitude: 39.9526, longitude: -75.1652, phone: "(215) 555-0110", email: "adopt@phillysecondchance.org", website: "https://example.org", description: "Giving bully breeds and big dogs the second chance they deserve." },
  { shelter_id: 6, name: "Catskill Mountain Rescue", city: "Kingston", state: "NY", zip: "12401", latitude: 41.927, longitude: -73.9974, phone: "(845) 555-0171", email: "rescue@catskillmr.org", website: "https://example.org", description: "Active, outdoorsy dogs looking for adventure partners." },
];

const BIOS = [
  "loves long walks, belly rubs and a good nap in the sun. Great on a leash and already knows sit and stay.",
  "is a gentle soul who warms up quickly and would thrive with a family that enjoys quiet evenings together.",
  "has endless energy and a big heart — perfect for an active household that loves hiking and playing fetch.",
  "is curious, clever and food-motivated, which makes training a joy. Gets along with most other dogs.",
  "is a cuddle champion who will follow you from room to room. Crate trained and house trained.",
  "came to us as a stray and has blossomed into a confident, affectionate companion.",
];

// [name, breed, age, size, gender, energy, kids, dogs, cats, apartment, shelter, photo path]
const DOG_ROWS = [
  ["Biscuit", "Beagle", 3, "medium", "male", "high", 1, 1, 0, 1, 1, "beagle/homer.jpg"],
  ["Luna", "Labrador Retriever", 2, "large", "female", "high", 1, 1, 1, 0, 1, "labrador/n02099712_5657.jpg"],
  ["Maple", "Golden Retriever", 5, "large", "female", "medium", 1, 1, 1, 0, 2, "retriever-golden/n02099601_70.jpg"],
  ["Koda", "Siberian Husky", 4, "large", "male", "high", 1, 1, 0, 0, 6, "husky/n02110185_11626.jpg"],
  ["Pip", "Cardigan Welsh Corgi", 1, "small", "male", "high", 1, 1, 1, 1, 3, "corgi-cardigan/n02113186_2413.jpg"],
  ["Coco", "Standard Poodle", 6, "large", "female", "medium", 1, 1, 1, 1, 3, "poodle-standard/n02113799_2325.jpg"],
  ["Otis", "Pug", 7, "small", "male", "low", 1, 1, 1, 1, 3, "pug/n02110958_11239.jpg"],
  ["Frankie", "Dachshund", 2, "small", "male", "medium", 0, 1, 1, 1, 2, "dachshund/dachshund-123503_640.jpg"],
  ["Rocky", "Boxer", 4, "large", "male", "high", 1, 0, 0, 0, 5, "boxer/n02108089_2670.jpg"],
  ["Bella", "Yorkshire Terrier", 8, "small", "female", "low", 0, 1, 1, 1, 3, "terrier-yorkshire/n02094433_2519.jpg"],
  ["Miso", "Shiba Inu", 3, "medium", "female", "medium", 0, 0, 0, 1, 3, "shiba/shiba-4.jpg"],
  ["Gus", "French Bulldog", 1, "small", "male", "medium", 1, 1, 1, 1, 1, "bulldog-french/n02108915_160.jpg"],
  ["Scout", "Border Collie", 2, "medium", "female", "high", 1, 1, 0, 0, 6, "collie-border/n02106166_3850.jpg"],
  ["Daisy", "Chihuahua", 9, "small", "female", "low", 0, 1, 1, 1, 2, "chihuahua/msdaisy.jpg"],
  ["Atlas", "Great Dane", 3, "extra_large", "male", "medium", 1, 1, 1, 0, 4, "dane-great/n02109047_12193.jpg"],
  ["Winston", "Basset Hound", 6, "medium", "male", "low", 1, 1, 1, 1, 4, "hound-basset/n02088238_9635.jpg"],
  ["Rosie", "Cocker Spaniel", 1, "medium", "female", "medium", 1, 1, 1, 1, 2, "spaniel-cocker/guusje1.jpg"],
  ["Ranger", "German Shorthaired Pointer", 2, "large", "male", "high", 1, 1, 0, 0, 6, "pointer-german/n02100236_1164.jpg"],
  ["Hana", "Akita", 5, "large", "female", "medium", 0, 0, 0, 0, 4, "akita/512px-akita_inu.jpg"],
  ["Milo", "Mixed Breed", 0, "medium", "male", "high", 1, 1, 1, 1, 1, "mix/milka7.jpg"],
  ["Tank", "Pit Bull Terrier", 3, "large", "male", "medium", 1, 1, 0, 0, 5, "pitbull/dog-5437227_640.jpg"],
  ["Pearl", "Maltese", 4, "small", "female", "low", 1, 1, 1, 1, 3, "maltese/n02085936_3315.jpg"],
  ["Nova", "Samoyed", 2, "large", "female", "high", 1, 1, 1, 0, 6, "samoyed/n02111889_4073.jpg"],
];

const DOGS = DOG_ROWS.map(([name, breed, age, size, gender, energy, kids, dogs, cats, apt, shelterId, photo], i) => ({
  dog_id: i + 1, name, breed, age_years: age, size, gender, energy_level: energy,
  good_with_kids: kids, good_with_dogs: dogs, good_with_cats: cats, apartment_friendly: apt,
  requires_yard: apt ? 0 : 1, is_vaccinated: 1, is_spayed_neutered: age > 0 ? 1 : 0,
  training_level: ["none", "basic", "advanced"][i % 3], ideal_owner_activity: { low: "sedentary", medium: "moderate", high: "active" }[energy],
  status: "available", shelter_id: shelterId, shelter_name: SHELTERS[shelterId - 1].name,
  description: `${name} ${BIOS[i % BIOS.length]}`, photos: `${PHOTO}/${photo}`, external_id: `demo-${i + 1}`,
}));

const RESOURCES = [
  ["Sit, Stay, Come: Teaching Basic Commands", "training", "Foundation commands every dog should know, with positive reinforcement techniques."],
  ["Leash Training Tips for New Dog Owners", "training", "Stop pulling on walks and build a calm, enjoyable leash habit."],
  ["Crate Training Without Tears", "training", "Turn the crate into a safe, cosy den your dog chooses to use."],
  ["How Much Should I Feed My Dog?", "nutrition", "Portion guides by weight, age and activity level — and signs you're over- or under-feeding."],
  ["Foods That Are Toxic to Dogs", "nutrition", "Chocolate, grapes, xylitol and other everyday foods to keep out of reach."],
  ["New Dog Vet Visit Checklist", "health", "What to bring, what to ask and what to expect at your first appointment."],
  ["Flea, Tick, and Heartworm Prevention", "health", "Overview of preventative treatments and why year-round protection matters."],
  ["Understanding Your Dog's Body Language", "behavior", "Tail wags, play bows and stress signals decoded."],
  ["Helping a Rescue Dog Decompress", "behavior", "The 3-3-3 rule and how to make the first weeks calm and predictable."],
  ["Setting Up Your Home for a New Dog", "general", "Dog-proofing checklist, essential supplies and how to set boundaries from day one."],
].map(([title, category, description], i) => ({
  resource_id: i + 1, title, category, description, content_type: "article", url: "https://www.akc.org/expert-advice/", is_published: 1,
  created_at: `2026-0${(i % 8) + 1}-12 10:00:00`,
}));

const QUIZ = [
  ["What best describes your home?", "home", [["Apartment or condo", "apartment_friendly", "1"], ["House with a yard", "requires_yard", "1"], ["House without a yard", "", ""]]],
  ["How active is your lifestyle?", "activity", [["Relaxed — short walks and couch time", "energy_level", "low"], ["Moderate — daily walks and weekend outings", "energy_level", "medium"], ["Very active — running, hiking, lots of play", "energy_level", "high"]]],
  ["What size dog are you hoping for?", "size", [["Small", "size", "small"], ["Medium", "size", "medium"], ["Large", "size", "large"]]],
  ["Are there children in your household?", "household", [["Yes", "good_with_kids", "1"], ["No", "", ""]]],
  ["Do you have other pets?", "pets", [["Another dog", "good_with_dogs", "1"], ["A cat", "good_with_cats", "1"], ["No other pets", "", ""]]],
];

let nextOption = 1;
const QUESTIONS = QUIZ.map(([text, category, options], i) => ({
  question_id: i + 1, question_text: text, category, display_order: i + 1,
  options: options.map(([option_text, maps_to_attribute, maps_to_value]) => ({
    option_id: nextOption++, question_id: i + 1, option_text, maps_to_attribute, maps_to_value,
  })),
}));

const STORIES = [
  { story_id: 1, user_id: 90, first_name: "Priya", last_name: "S.", title: "Luna found her couch", story: "We were nervous first-time adopters, but the matching quiz pointed us to a calm senior who fits our apartment perfectly. Six months later she runs the house.", status: "approved", created_at: "2026-06-02 09:00:00" },
  { story_id: 2, user_id: 91, first_name: "Marcus", last_name: "T.", title: "From shelter to trail buddy", story: "Ranger had so much energy the shelter struggled to keep up. Now he hikes with me every weekend and sleeps like a log every night.", status: "approved", created_at: "2026-05-18 09:00:00" },
  { story_id: 3, user_id: 92, first_name: "The Alvarez", last_name: "Family", title: "Our kids' best friend", story: "The application was simple and the shelter answered every question in Messages. Biscuit has been glued to our kids since day one.", status: "approved", created_at: "2026-04-27 09:00:00" },
  { story_id: 4, user_id: 93, first_name: "Jordan", last_name: "K.", title: "Second chances", story: "Tank was overlooked for months. He's the gentlest dog I've ever met.", status: "pending", created_at: "2026-09-20 09:00:00" },
];

// Per-visitor state for the session.
const state = {
  saved: new Set([2, 5, 13]),
  applications: [
    { application_id: 1, user_id: 1, dog_id: 3, dog_name: "Maple", status: "pending", housing_type: "house", has_yard: 1, has_children: 1, has_other_pets: 0, submitted_at: "2026-09-18 14:12:00", full_name: "Demo Adopter", email: "demo@canineconnections.org", first_name: "Demo", last_name: "Adopter", phone: "(555) 010-2030", reason_for_adopting: "Looking for a family companion.", prior_pet_experience: "Grew up with dogs." },
    { application_id: 2, user_id: 7, dog_id: 9, dog_name: "Rocky", status: "approved", housing_type: "house", has_yard: 1, has_children: 0, has_other_pets: 1, submitted_at: "2026-09-10 09:40:00", full_name: "Sam Rivera", email: "sam@example.com", first_name: "Sam", last_name: "Rivera", phone: "(555) 010-8844", reason_for_adopting: "Running partner.", prior_pet_experience: "Two previous rescues." },
    { application_id: 3, user_id: 8, dog_id: 16, dog_name: "Winston", status: "pending", housing_type: "apartment", has_yard: 0, has_children: 0, has_other_pets: 0, submitted_at: "2026-09-21 18:05:00", full_name: "Ava Chen", email: "ava@example.com", first_name: "Ava", last_name: "Chen", phone: "(555) 010-7712", reason_for_adopting: "Quiet home, work from home.", prior_pet_experience: "First dog." },
  ],
  logs: [
    { log_id: 1, user_id: 1, dog_id: 0, log_type: "milestone", title: "First night home", notes: "Slept through the night in the crate. Big win!", log_date: "2026-09-12" },
    { log_id: 2, user_id: 1, dog_id: 0, log_type: "vet", title: "Welcome vet visit", notes: "Healthy weight, next vaccines due in March.", log_date: "2026-09-15" },
  ],
  chats: [{ session_id: 1, user_id: 1, shelter_id: 2, dog_id: 3, status: "open", started_at: "2026-09-18 15:00:00" }],
  messages: [
    { message_id: 1, session_id: 1, sender_id: 1, first_name: "Demo", message: "Hi! Is Maple still available? We'd love to meet her.", sent_at: "2026-09-18 15:00:00" },
    { message_id: 2, session_id: 1, sender_id: 0, first_name: "Jersey Shore", message: "She is! Would Saturday at 11 work for a meet and greet?", sent_at: "2026-09-18 16:20:00" },
  ],
  stories: STORIES,
};

let seq = 100;
const ok = (extra = {}) => ({ success: true, ...extra });
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function demoToken(user) {
  const claims = { typ: "session", uid: user.user_id, role: user.role, email: user.email, exp: Math.floor(Date.now() / 1000) + 7 * 86400 };
  return `${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.demo`;
}

function login({ email = "" }) {
  const isAdmin = email.toLowerCase().startsWith("admin");
  const user = {
    user_id: isAdmin ? 2 : 1, email: email || "demo@canineconnections.org", role: isAdmin ? "super_admin" : "adopter",
    first_name: isAdmin ? "Alex" : "Demo", last_name: isAdmin ? "Admin" : "Adopter",
    phone: "(555) 010-2030", address: "123 Main St, Newark, NJ", email_verified: 1, login_notifications: 0,
  };
  return ok({ user, token: demoToken(user) });
}

function dogsList({ size, breed, energy_level, shelter_id, max_age, limit = 20, offset = 0, status = "available" }) {
  let dogs = DOGS.filter(d => d.status === status || !status);
  if (size) dogs = dogs.filter(d => d.size === size);
  if (breed) dogs = dogs.filter(d => d.breed === breed);
  if (energy_level) dogs = dogs.filter(d => d.energy_level === energy_level);
  if (shelter_id) dogs = dogs.filter(d => d.shelter_id === Number(shelter_id));
  if (max_age !== undefined && max_age !== null && max_age !== "") dogs = dogs.filter(d => d.age_years <= Number(max_age));
  return ok({ dogs: dogs.slice(offset, offset + limit) });
}

function quizSubmit({ answers = {} }) {
  const chosen = Object.values(answers).map(Number);
  const traits = QUESTIONS.flatMap(q => q.options).filter(o => chosen.includes(o.option_id) && o.maps_to_attribute);
  const scored = DOGS.map(d => ({ id: d.dog_id, score: traits.filter(t => String(d[t.maps_to_attribute]) === t.maps_to_value).length }))
    .sort((a, b) => b.score - a.score);
  return ok({ matched_dog_ids: scored.slice(0, 6).map(s => s.id) });
}

const handlers = {
  "request.auth.login": login,
  "request.auth.register": ({ email, firstName, lastName }) => ok({ user_id: ++seq, email, first_name: firstName, last_name: lastName, role: "adopter" }),
  "request.auth.verify": () => ok(),
  "request.auth.forgotPassword": () => ok(),
  "request.auth.setNewPassword": () => ok(),
  "request.auth.resendVerification": () => ok(),
  "request.profile.update": () => ok(),
  "request.account.delete": () => ok(),

  "request.dogs.list": dogsList,
  "request.dogs.get": ({ dog_id }) => {
    const dog = DOGS.find(d => d.dog_id === Number(dog_id));
    return dog ? ok({ dog: { ...dog, photos: [{ photo_url: dog.photos, is_primary: 1 }] } }) : { success: false, error: "Dog not found" };
  },
  "request.api.dog.upsert": (d) => ok({ dog_id: d.dog_id || ++seq, action: d.dog_id ? "updated" : "inserted" }),
  "request.shelters.list": () => ok({ shelters: SHELTERS }),
  "request.shelters.get": ({ shelter_id }) => {
    const shelter = SHELTERS.find(s => s.shelter_id === Number(shelter_id));
    return shelter ? ok({ shelter }) : { success: false, error: "Shelter not found" };
  },

  "request.saved_dogs.list": () => ok({ dogs: DOGS.filter(d => state.saved.has(d.dog_id)) }),
  "request.saved_dogs.add": ({ dog_id }) => { state.saved.add(Number(dog_id)); return ok(); },
  "request.saved_dogs.remove": ({ dog_id }) => { state.saved.delete(Number(dog_id)); return ok(); },

  "request.application.submit": ({ dog_id }) => {
    const dog = DOGS.find(d => d.dog_id === Number(dog_id));
    state.applications.unshift({ application_id: ++seq, user_id: 1, dog_id: Number(dog_id), dog_name: dog?.name, status: "pending", submitted_at: now(), full_name: "Demo Adopter", email: "demo@canineconnections.org", first_name: "Demo", last_name: "Adopter" });
    return ok({ application_id: seq });
  },
  "request.application.list": ({ user_id }) => ok({ applications: user_id ? state.applications.filter(a => a.user_id === 1) : state.applications }),
  "request.application.approve": ({ application_id }) => { const a = state.applications.find(x => x.application_id === application_id); if (a) a.status = "approved"; return ok(); },
  "request.application.reject": ({ application_id }) => { const a = state.applications.find(x => x.application_id === application_id); if (a) a.status = "rejected"; return ok(); },
  "request.adoptions.finalize": ({ application_id }) => { const a = state.applications.find(x => x.application_id === application_id); if (a) a.status = "finalized"; return ok(); },
  "request.adoptions.list": () => ok({ adoptions: [] }),

  "request.quiz.questions": () => ok({ questions: QUESTIONS }),
  "request.quiz.submit": quizSubmit,

  "request.adoption.log.list": () => ok({ logs: [...state.logs].sort((a, b) => b.log_date.localeCompare(a.log_date)) }),
  "request.adoption.log.create": (d) => { state.logs.push({ ...d, log_id: ++seq }); return ok({ log_id: seq }); },
  "request.adoption.log.delete": ({ log_id }) => { state.logs = state.logs.filter(l => l.log_id !== log_id); return ok(); },

  "request.resources.list": () => ok({ resources: RESOURCES }),
  "request.stories.list": ({ limit = 10 }) => ok({ stories: state.stories.filter(s => s.status === "approved" || window.location.pathname.startsWith("/admin")).slice(0, limit) }),
  "request.stories.approve": ({ story_id }) => { const s = state.stories.find(x => x.story_id === story_id); if (s) s.status = "approved"; return ok(); },

  "request.chat.sessions": () => ok({ sessions: state.chats.map(c => {
    const shelter = SHELTERS.find(s => s.shelter_id === c.shelter_id);
    const last = state.messages.filter(m => m.session_id === c.session_id).at(-1);
    return { ...c, shelter_name: shelter.name, city: shelter.city, state: shelter.state, phone: shelter.phone, email: shelter.email, last_message: last?.message, last_message_at: last?.sent_at };
  }) }),
  "request.chat.start": ({ shelter_id, dog_id }) => {
    let chat = state.chats.find(c => c.shelter_id === Number(shelter_id));
    if (!chat) { chat = { session_id: ++seq, user_id: 1, shelter_id: Number(shelter_id), dog_id: dog_id ?? null, status: "open", started_at: now() }; state.chats.push(chat); }
    return ok({ session_id: chat.session_id });
  },
  "request.chat.history": ({ session_id }) => ok({ messages: state.messages.filter(m => m.session_id === Number(session_id)) }),
  "request.chat.message": ({ session_id, message }) => {
    state.messages.push({ message_id: ++seq, session_id: Number(session_id), sender_id: 1, first_name: "Demo", message, sent_at: now() });
    return ok({ message_id: seq });
  },
  "request.enquiry.send": () => ok({ session_id: 1 }),
};

// Requests anyone may make without logging in (mirrors backend/src/Security/AccessPolicy.php).
const PUBLIC = new Set([
  "request.auth.register", "request.auth.login", "request.auth.verify", "request.auth.forgotPassword",
  "request.auth.setNewPassword", "request.auth.resendVerification", "request.shelters.list", "request.shelters.get",
  "request.dogs.list", "request.dogs.get", "request.quiz.questions", "request.parks.list", "request.resources.list",
  "request.resources.get", "request.stories.list", "request.badges.list",
]);

// Mimics the network: a short delay, then the handler's answer. Like the real backend, requests
// that need an account are refused when no session token is sent.
export async function demoRequest(type, payload = {}, token = null) {
  await new Promise(r => setTimeout(r, 120 + Math.random() * 180));
  if (!token && !PUBLIC.has(type)) return { success: false, code: "auth_required", error: "Please log in to continue." };
  const handler = handlers[type];
  return handler ? handler(payload) : { success: true };
}

// Also used to generate database/sql/dev_seed.sql, so the local stack shows the same data.
export const DEMO_DATA = { SHELTERS, DOGS, RESOURCES, QUESTIONS, STORIES };
