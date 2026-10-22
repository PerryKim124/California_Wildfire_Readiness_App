import { createContext, useContext } from "react";
import { supabase } from "./supabase";

// Everything ReadyCA knows about one account's household. Stored as a single JSON
// document per user in the household_profiles table (supabase/household.sql).

export type MemberType = "Adult" | "Child" | "Older adult";
export type Member = { id: string; name: string; type: MemberType; age: number | null; supportNeeds: string; planReady: boolean };
export type PetCheck = "carrier" | "records" | "supplyKit" | "emergencyContact";
export type Pet = { id: string; name: string; species: "Dog" | "Cat" | "Bird" | "Other"; age: number | null; checks: Record<PetCheck, boolean> };
export type Vehicle = { id: string; name: string; seats: number; power: "Fuel" | "Electric" | "Hybrid"; level: number };
export type ContactKind = "Emergency contact" | "Out-of-area contact" | "School / childcare" | "Neighbor";
export type Contact = { id: string; name: string; kind: ContactKind; detail: string };
export type ResourceStatus = "ready" | "attention" | "missing";
export type ResourceState = { status: ResourceStatus; quantity: string; location: string; updatedAt: string | null };
/** A place picked on the evacuation map. */
export type MapPlace = { label: string; lat: number; lng: number };
/** A planned route, saved so the dashboard can show it without re-routing. `line` is simplified [lat, lng] points. */
export type SavedRoute = { miles: number; minutes: number; roads: string[]; line: [number, number][] };
/** The evacuation map: where the household starts, where it goes, and the routes saved with the plan. */
export type EvacuationMap = { home: MapPlace | null; destination: MapPlace | null; primary: SavedRoute | null; backup: SavedRoute | null };

export type HouseholdProfile = {
  version: 1;
  location: { county: string; city: string };
  owner: Omit<Member, "id" | "name">; // the account holder; their name comes from the account
  members: Member[]; // everyone else in the household
  roles: Record<string, string>; // role -> member id (OWNER_ID for the account holder)
  pets: Pet[];
  vehicles: Vehicle[];
  contacts: Contact[];
  meetingPoint: string;
  resources: Record<string, ResourceState>;
  evacuationPlanSaved: boolean;
  evacuation: EvacuationMap;
};

export const OWNER_ID = "owner";
export const MEMBER_TYPES: MemberType[] = ["Adult", "Child", "Older adult"];
export const PET_SPECIES: Pet["species"][] = ["Dog", "Cat", "Bird", "Other"];
export const VEHICLE_POWER: Vehicle["power"][] = ["Fuel", "Electric", "Hybrid"];
export const CONTACT_KINDS: ContactKind[] = ["Emergency contact", "Out-of-area contact", "School / childcare", "Neighbor"];
export const ROLES = ["Emergency Contact Manager", "Pet Coordinator", "Supply Manager", "Vehicle Coordinator", "Child Safety Lead"];
export const PET_CHECKS: [PetCheck, string][] = [["carrier", "Carrier"], ["records", "Vaccination & medical records"], ["supplyKit", "Pet supply kit"], ["emergencyContact", "Emergency contact"]];

export const CA_COUNTIES = ["Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa", "Del Norte", "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake", "Lassen", "Los Angeles", "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", "Mono", "Monterey", "Napa", "Nevada", "Orange", "Placer", "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino", "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo", "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra", "Siskiyou", "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare", "Tuolumne", "Ventura", "Yolo", "Yuba"];

// Supply checklist shown in Household → Resources. Status per item is stored per account.
export const RESOURCE_CATALOG: { name: string; icon: "shield" | "box" | "spark" | "phone" | "file"; items: { name: string; impact: number; why: string }[] }[] = [
  { name: "Safety Equipment", icon: "shield", items: [
    { name: "Fire extinguisher", impact: 1, why: "Lets you stop a small fire before it spreads." },
    { name: "Smoke alarms", impact: 1, why: "Early warning is critical, especially at night." },
    { name: "Carbon monoxide detector", impact: 1, why: "Generators and smoke can create dangerous CO levels." },
    { name: "N95 masks", impact: 2, why: "Helps reduce smoke-particle exposure during evacuation." },
  ] },
  { name: "Emergency Supplies", icon: "box", items: [
    { name: "72-hour emergency kit", impact: 2, why: "Essential supplies support your household during evacuation." },
    { name: "Water storage", impact: 2, why: "Plan for one gallon per person per day for at least three days." },
    { name: "Food supply", impact: 1, why: "Non-perishable food for at least three days." },
    { name: "First aid kit", impact: 1, why: "Treat minor injuries when help may be delayed." },
  ] },
  { name: "Power & Lighting", icon: "spark", items: [
    { name: "Flashlights", impact: 1, why: "Power outages are common during wildfires." },
    { name: "Spare batteries", impact: 1, why: "Keeps lights and radios running." },
    { name: "Solar charger", impact: 1, why: "Recharges phones without grid power." },
    { name: "Power banks", impact: 1, why: "Keeps phones charged for alerts and calls." },
  ] },
  { name: "Communication Tools", icon: "phone", items: [
    { name: "Battery radio", impact: 2, why: "A battery radio provides official updates if mobile service fails." },
    { name: "Emergency contacts", impact: 1, why: "A printed card works even when phones don't." },
    { name: "Printed plans", impact: 1, why: "Everyone can follow the plan without a phone." },
    { name: "Backup phone charging", impact: 1, why: "Car adapters and cables keep phones alive on the road." },
  ] },
  { name: "Important Documents", icon: "file", items: [
    { name: "Identification copies", impact: 1, why: "Needed for shelters, aid, and insurance." },
    { name: "Insurance documents", impact: 1, why: "Speeds up claims after a loss." },
    { name: "Medical information", impact: 1, why: "A printed medical summary supports continuity of care during displacement." },
    { name: "Property documents", impact: 1, why: "Proves ownership for recovery assistance." },
  ] },
];
export const ALL_RESOURCES = RESOURCE_CATALOG.flatMap((c) => c.items);

const noChecks = (): Record<PetCheck, boolean> => ({ carrier: false, records: false, supplyKit: false, emergencyContact: false });
const missing = (): ResourceState => ({ status: "missing", quantity: "", location: "", updatedAt: null });

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** A brand-new account: nothing known yet except that the account holder is an adult. */
export function emptyProfile(): HouseholdProfile {
  return {
    version: 1,
    location: { county: "", city: "" },
    owner: { type: "Adult", age: null, supportNeeds: "", planReady: false },
    members: [], roles: {}, pets: [], vehicles: [], contacts: [], meetingPoint: "",
    resources: Object.fromEntries(ALL_RESOURCES.map((r) => [r.name, missing()])),
    evacuationPlanSaved: false,
    evacuation: { home: null, destination: null, primary: null, backup: null },
  };
}

/** Sample household shown to guests exploring the demo. Never saved to an account. */
export function demoProfile(): HouseholdProfile {
  const ready = (quantity: string, location: string): ResourceState => ({ status: "ready", quantity, location, updatedAt: "2026-09-12" });
  const p = emptyProfile();
  return {
    ...p,
    location: { county: "San Diego", city: "Poway" },
    owner: { type: "Adult", age: null, supportNeeds: "", planReady: true },
    members: [
      { id: "robert", name: "Robert", type: "Older adult", age: 74, supportNeeds: "Mobility assistance required", planReady: false },
      { id: "maya", name: "Maya", type: "Child", age: 9, supportNeeds: "Child safety plan", planReady: true },
    ],
    roles: { "Emergency Contact Manager": OWNER_ID, "Pet Coordinator": "maya", "Supply Manager": "robert", "Vehicle Coordinator": OWNER_ID },
    pets: [
      { id: "luna", name: "Luna", species: "Dog", age: 6, checks: { carrier: false, records: true, supplyKit: true, emergencyContact: true } },
      { id: "milo", name: "Milo", species: "Cat", age: 3, checks: { carrier: true, records: false, supplyKit: false, emergencyContact: true } },
    ],
    vehicles: [
      { id: "crv", name: "Honda CR-V", seats: 5, power: "Fuel", level: 70 },
      { id: "modely", name: "Tesla Model Y", seats: 5, power: "Electric", level: 42 },
    ],
    contacts: [
      { id: "c1", name: "Robert", kind: "Emergency contact", detail: "Verified" },
      { id: "c2", name: "Lincoln Elementary", kind: "School / childcare", detail: "School card ready" },
      { id: "c3", name: "The Garcias", kind: "Neighbor", detail: "Mutual support" },
    ],
    meetingPoint: "Poway Library parking lot",
    // Demo trip: central Poway to the Del Mar Fairgrounds, a regular San Diego County evacuation site.
    evacuation: { home: { label: "Poway, San Diego County, California", lat: 32.9628, lng: -117.0359 }, destination: { label: "Del Mar Fairgrounds, Del Mar, San Diego County", lat: 32.9758, lng: -117.2617 }, primary: null, backup: null },
    resources: {
      ...p.resources,
      "Fire extinguisher": ready("1", "Garage cabinet"), "Smoke alarms": ready("4", "Throughout home"), "Carbon monoxide detector": ready("2", "Hallways"),
      "72-hour emergency kit": ready("1", "Garage emergency shelf"), "Water storage": { status: "attention", quantity: "6 gal", location: "Garage emergency shelf", updatedAt: "2026-09-12" },
      "Food supply": ready("12 meals", "Kitchen pantry"), "First aid kit": ready("1", "Hall closet"),
      Flashlights: ready("3", "Emergency shelf"), "Spare batteries": ready("16", "Emergency shelf"), "Solar charger": ready("1", "Go-bag"), "Power banks": ready("2", "Go-bag"),
      "Emergency contacts": ready("5", "Phones + printed card"), "Printed plans": ready("2", "Go-bag and vehicle"), "Backup phone charging": ready("2", "Go-bag"),
      "Identification copies": ready("4", "Waterproof document pouch"), "Insurance documents": ready("1 set", "Document pouch + cloud"), "Property documents": ready("1 set", "Encrypted cloud folder"),
    },
  };
}

/** Fill in anything missing from an older or partial saved profile so the UI can rely on every field. */
export function normalizeProfile(raw: unknown): HouseholdProfile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<HouseholdProfile>;
  return {
    ...base, ...r, version: 1,
    location: { ...base.location, ...(r.location ?? {}) },
    owner: { ...base.owner, ...(r.owner ?? {}) },
    members: Array.isArray(r.members) ? r.members : [],
    roles: r.roles && typeof r.roles === "object" ? r.roles : {},
    pets: Array.isArray(r.pets) ? r.pets.map((pet) => ({ ...pet, checks: { ...noChecks(), ...(pet.checks ?? {}) } })) : [],
    vehicles: Array.isArray(r.vehicles) ? r.vehicles : [],
    contacts: Array.isArray(r.contacts) ? r.contacts : [],
    meetingPoint: typeof r.meetingPoint === "string" ? r.meetingPoint : "",
    resources: { ...base.resources, ...(r.resources ?? {}) },
    evacuationPlanSaved: Boolean(r.evacuationPlanSaved),
    evacuation: { ...base.evacuation, ...(r.evacuation && typeof r.evacuation === "object" ? r.evacuation : {}) },
  };
}

export const newPet = (name: string, species: Pet["species"], age: number | null): Pet => ({ id: newId(), name, species, age, checks: noChecks() });

// ---- display helpers --------------------------------------------------------

export const countyLabel = (p: HouseholdProfile) => (p.location.county ? `${p.location.county} County` : "");
export const locationShort = (p: HouseholdProfile) => (p.location.county ? `${p.location.county} County, CA` : "Set your location");
export const locationLong = (p: HouseholdProfile) => (p.location.county ? `${p.location.city ? `${p.location.city}, ` : ""}${p.location.county} County, California` : "Location not set");
export const memberLabel = (m: Pick<Member, "type" | "age">) => (m.age != null ? `${m.type} · age ${m.age}` : m.type);
export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return w.length === 0 ? "?" : w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[w.length - 1][0]).toUpperCase();
};
const IRREGULAR: Record<string, string> = { person: "people", child: "children" };
export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : IRREGULAR[word] ?? `${word}s`}`;

// ---- analysis: every score shown on the Household pages comes from here --------

export type Gap = { title: string; copy: string; points: number };
export type HouseholdAnalysis = {
  people: number; pets: number; transportation: number; communication: number; resources: number; evacuation: number;
  peopleCount: number; seatsNeeded: number; seats: number; seatsWithoutPrimary: number;
  commChecks: [string, boolean][]; resourceReady: number; resourceTotal: number;
  completeness: number; missingDetails: number; gaps: Gap[]; strengths: string[];
};

const pct = (n: number, d: number) => (d === 0 ? 100 : Math.round((n / d) * 100));
const petScore = (pet: Pet) => pct(Object.values(pet.checks).filter(Boolean).length, PET_CHECKS.length);
export { petScore };

export function analyzeHousehold(p: HouseholdProfile): HouseholdAnalysis {
  const everyone = [{ ...p.owner, name: "You", id: OWNER_ID }, ...p.members];
  const peopleCount = everyone.length;
  const people = pct(everyone.filter((m) => m.planReady).length, peopleCount);
  const pets = p.pets.length ? Math.round(p.pets.reduce((s, pet) => s + petScore(pet), 0) / p.pets.length) : 100;

  const seatsNeeded = peopleCount + p.pets.length;
  const seats = p.vehicles.reduce((s, v) => s + v.seats, 0);
  const seatsWithoutPrimary = seats - (p.vehicles[0]?.seats ?? 0);
  const avgLevel = p.vehicles.length ? p.vehicles.reduce((s, v) => s + v.level, 0) / p.vehicles.length : 0;
  const transportation = p.vehicles.length === 0 ? 0 : Math.round((seats >= seatsNeeded ? 60 : 30 * (seats / seatsNeeded)) + 40 * (avgLevel / 100));

  const has = (kind: ContactKind) => p.contacts.some((c) => c.kind === kind);
  const commChecks: [string, boolean][] = [["Primary contact (you)", true], ["Backup contact", has("Emergency contact")], ["Out-of-area contact", has("Out-of-area contact")], ["Emergency meeting point", p.meetingPoint.trim() !== ""]];
  const communication = pct(commChecks.filter(([, ok]) => ok).length, commChecks.length);

  const states = ALL_RESOURCES.map((r) => p.resources[r.name]?.status ?? "missing");
  const resourceReady = states.filter((s) => s === "ready").length;
  const resources = pct(states.filter((s) => s !== "missing").length, states.length);

  const evacuation = (p.evacuationPlanSaved ? 50 : 0) + (p.meetingPoint.trim() ? 25 : 0) + (p.vehicles.length ? 25 : 0);

  const gaps: Gap[] = [];
  if (!p.location.county) gaps.push({ title: "Set your preparedness location", copy: "Your county determines local risk, alerts, and evacuation guidance.", points: 0 });
  if (!has("Out-of-area contact")) gaps.push({ title: "Add an out-of-area contact", copy: "Local networks may be congested or unavailable during a regional emergency.", points: 4 });
  if (!p.meetingPoint.trim()) gaps.push({ title: "Choose an emergency meeting point", copy: "A shared meeting point helps everyone reconnect if you get separated.", points: 3 });
  if (!p.evacuationPlanSaved) gaps.push({ title: "Save your evacuation plan", copy: "A shared plan reduces delays when every minute matters.", points: 8 });
  if (p.vehicles.length === 0) gaps.push({ title: "Add your evacuation vehicle", copy: "ReadyCA checks seating capacity and fuel for everyone in your household.", points: 3 });
  else if (seats < seatsNeeded) gaps.push({ title: "Plan for more seats", copy: `Your vehicles seat ${seats}, but ${seatsNeeded} people and pets need to evacuate.`, points: 3 });
  for (const v of p.vehicles) if (v.level < 50) gaps.push({ title: `${v.power === "Electric" ? "Charge" : "Refuel"} the ${v.name}`, copy: `It is at ${v.level}%. Keep vehicles above half during fire season.`, points: 1 });
  for (const pet of p.pets) {
    const todo = PET_CHECKS.filter(([k]) => !pet.checks[k]).map(([, label]) => label.toLowerCase());
    if (todo.length) gaps.push({ title: `Finish ${pet.name}'s evacuation profile`, copy: `Still needed: ${todo.join(", ")}.`, points: 1 });
  }
  for (const m of p.members) if (!m.planReady) gaps.push({ title: `Confirm ${m.name}'s plan`, copy: m.supportNeeds ? `${m.name} needs support: ${m.supportNeeds}.` : `Make sure ${m.name} has a go-bag and knows the plan.`, points: 1 });
  if (!p.owner.planReady) gaps.push({ title: "Confirm your own go-bag and plan", copy: "Mark yourself ready once your go-bag is packed.", points: 1 });
  const unassigned = ROLES.filter((role) => !p.roles[role]).length;
  if (unassigned) gaps.push({ title: `Assign ${plural(unassigned, "emergency role")}`, copy: "Clear responsibilities prevent confusion during an evacuation.", points: 1 });
  gaps.sort((a, b) => b.points - a.points);

  const strengths: string[] = [];
  if (p.vehicles.length && seats >= seatsNeeded) strengths.push(p.vehicles.length > 1 ? "Multiple transportation options" : "Enough vehicle seating for everyone");
  if (resources >= 75) strengths.push("Emergency supplies mostly in place");
  if (communication === 100) strengths.push("Complete communication plan");
  if (people === 100) strengths.push("Everyone has a confirmed plan");
  if (p.pets.length && pets === 100) strengths.push("Pets are evacuation-ready");
  if (p.evacuationPlanSaved) strengths.push("Evacuation plan saved");

  const checklist = [
    p.location.county !== "", p.owner.planReady, p.members.every((m) => m.planReady), ROLES.every((role) => p.roles[role]),
    has("Emergency contact"), has("Out-of-area contact"), p.meetingPoint.trim() !== "", p.vehicles.length > 0, p.pets.every((pet) => petScore(pet) === 100),
  ];
  const completeness = pct(checklist.filter(Boolean).length, checklist.length);

  return { people, pets, transportation, communication, resources, evacuation, peopleCount, seatsNeeded, seats, seatsWithoutPrimary, commChecks, resourceReady, resourceTotal: states.length, completeness, missingDetails: checklist.filter((ok) => !ok).length, gaps, strengths };
}

// ---- persistence ------------------------------------------------------------

export async function loadHousehold(userId: string): Promise<{ profile: HouseholdProfile | null; error: string | null }> {
  if (!supabase) return { profile: null, error: null };
  const { data, error } = await supabase.from("household_profiles").select("profile").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("Could not load household:", error.message);
    return { profile: null, error: error.message };
  }
  return { profile: data ? normalizeProfile(data.profile) : null, error: null };
}

export async function saveHousehold(userId: string, profile: HouseholdProfile): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("household_profiles").upsert({ user_id: userId, profile, updated_at: new Date().toISOString() });
  if (error) console.error("Could not save household:", error.message);
  return error?.message ?? null;
}

// ---- context ----------------------------------------------------------------

export type SaveState = "idle" | "saving" | "saved" | "error" | "local";
export type HouseholdContextValue = {
  profile: HouseholdProfile;
  update: (change: (p: HouseholdProfile) => HouseholdProfile) => void;
  saveState: SaveState;
  saveError: string | null;
};

export const HouseholdContext = createContext<HouseholdContextValue>({ profile: demoProfile(), update: () => {}, saveState: "local", saveError: null });
export const useHousehold = () => useContext(HouseholdContext);
