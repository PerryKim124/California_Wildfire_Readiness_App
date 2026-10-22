import type { HouseholdProfile } from "./household";

// Content for the Emergency Decision Game modes. Guidance follows CAL FIRE "Ready, Set, Go!"
// and National Weather Service / Cal OES alert definitions.

export type Scenario = { q: string; opts: string[]; correct: number; why: string; level: "Foundation" | "Intermediate" | "Advanced" };

export const SCENARIOS: Scenario[] = [
  { level: "Foundation", q: "A wildfire is spreading rapidly nearby. Local authorities issue an evacuation warning. What do you do first?", opts: ["Wait until you can see smoke", "Begin preparing and monitor official alerts", "Drive toward the fire to see how close it is", "Wait for neighbors to tell you"], correct: 1, why: "An evacuation warning means prepare to leave now. Gathering your household, go-kit, and monitoring official updates reduces delay if an order follows." },
  { level: "Foundation", q: "A Red Flag Warning is issued for tomorrow. What is the most useful thing to do today?", opts: ["Mow dry grass in the afternoon heat", "Charge phones, fuel the car, and check your go-bag", "Plan a backyard barbecue", "Nothing until a fire starts"], correct: 1, why: "Red Flag Warnings mean critical fire weather. Getting ready before a fire starts saves time, and using mowers or open flames in dry, windy conditions can spark a fire." },
  { level: "Intermediate", q: "Smoke is reducing visibility and your primary route is congested. What is your safest next step?", opts: ["Use your pre-planned backup route if officials say it is open", "Take an unmarked dirt road", "Stop to photograph the fire", "Ignore official road closures"], correct: 0, why: "A practiced backup route gives you a safer alternative, but you should still follow official traffic controls and closure information." },
  { level: "Intermediate", q: "Someone in your household uses a wheelchair. An evacuation warning is issued. When should you leave?", opts: ["Only when an evacuation order is issued", "Now, during the warning", "After packing every room", "When you see flames"], correct: 1, why: "People who need extra time, including those with mobility or medical needs and households with pets or livestock, should leave as soon as a warning is issued." },
  { level: "Intermediate", q: "You're about to evacuate. What should you do with your home's sprinklers?", opts: ["Turn them on full and leave", "Leave them off and close windows and doors", "Wet only the roof", "Fill every sink and tub and leave taps running"], correct: 1, why: "Running sprinklers or taps can drop the water pressure firefighters need. Close windows and doors to keep embers out instead." },
  { level: "Advanced", q: "Your family is separated when an evacuation order arrives. How should you reconnect?", opts: ["Everyone returns home", "Post your location publicly", "Use your out-of-area contact and planned meeting point", "Wait for cellular service to improve"], correct: 2, why: "A shared meeting point and out-of-area contact reduce confusion when local networks are overloaded." },
  { level: "Advanced", q: "You are trapped by fire while driving and can't continue. What is the safest action?", opts: ["Get out and run through the smoke", "Park away from vegetation, stay in the car, close vents, and lie low", "Keep driving toward the flames", "Open the windows to see better"], correct: 1, why: "A car offers more protection than running in the open. Park in a clear area, keep windows and vents closed, cover up, lie on the floor, and call 911." },
];

export type BagItem = { name: string; essential: boolean; why: string };

/** Go-bag challenge: essentials adapt to the household (pets, children, support needs). */
export function bagItems(profile: HouseholdProfile): BagItem[] {
  const items: BagItem[] = [
    { name: "Water (1 gallon per person per day)", essential: true, why: "Plan for at least three days." },
    { name: "Prescriptions & medications", essential: true, why: "Pharmacies may be closed or unreachable." },
    { name: "N95 masks", essential: true, why: "Filter fine smoke particles; cloth masks don't." },
    { name: "Phone charger & power bank", essential: true, why: "Alerts and contacts depend on a charged phone." },
    { name: "Copies of ID & insurance", essential: true, why: "Needed for shelters, aid, and claims." },
    { name: "First aid kit", essential: true, why: "Help may be delayed during a large incident." },
    { name: "Flashlight & extra batteries", essential: true, why: "Power outages are common during wildfires." },
    { name: "Sturdy shoes & change of clothes", essential: true, why: "Cotton or wool and closed-toe shoes protect you." },
    { name: "Decorative candles", essential: false, why: "A fire hazard; pack a flashlight instead." },
    { name: "Board games", essential: false, why: "Nice to have, but uses space essentials need." },
    { name: "Full set of kitchen pots", essential: false, why: "Too bulky; shelters provide meals." },
    { name: "Houseplants", essential: false, why: "Not a priority when every minute counts." },
    { name: "Extra dress shoes", essential: false, why: "One pair of sturdy shoes is enough." },
    { name: "Large speaker", essential: false, why: "Takes space and battery power you'll need." },
  ];
  if (profile.pets.length) items.push({ name: "Pet food, leash & carrier", essential: true, why: `${profile.pets.map((p) => p.name).join(" and ")} need${profile.pets.length === 1 ? "s" : ""} supplies too.` });
  if (profile.members.some((m) => m.type === "Child")) items.push({ name: "Child comfort item & snacks", essential: true, why: "Familiar items reduce stress for children." });
  if ([profile.owner, ...profile.members].some((m) => m.supportNeeds)) items.push({ name: "Mobility aids & medical equipment", essential: true, why: "Support needs don't pause during an evacuation." });
  return items;
}

/** Evacuation steps in the recommended order. */
export const EVACUATION_STEPS = [
  { step: "Confirm the alert from an official source", why: "Rumors spread fast; act on official warnings and orders." },
  { step: "Gather everyone in the household, including pets", why: "Knowing where everyone is comes before anything else." },
  { step: "Load go-bags, medications, and documents into the car", why: "Back the car in, pointed out, so you can leave quickly." },
  { step: "Close windows and doors, and leave lights on", why: "Closed openings keep embers out; lights help firefighters find your home in smoke." },
  { step: "Leave early using your planned route", why: "Leaving early avoids congestion and lets firefighters work." },
  { step: "Check in with your out-of-area contact", why: "Let someone outside the area know you're safe and where you're going." },
];

export const MYTHS: { statement: string; fact: boolean; why: string }[] = [
  { statement: "If you can't see smoke yet, you don't need to act on an evacuation warning.", fact: false, why: "Fires can move faster than you can see. A warning means get ready to leave now." },
  { statement: "Embers can ignite homes a mile or more ahead of the fire.", fact: true, why: "Wind-blown embers cause most home ignitions, often far from the flames." },
  { statement: "Cloth masks protect you from wildfire smoke as well as N95 masks.", fact: false, why: "Only well-fitted N95 or P100 respirators filter fine smoke particles." },
  { statement: "Leaving sprinklers running while you evacuate helps firefighters.", fact: false, why: "It can reduce the water pressure firefighters depend on." },
  { statement: "Text messages often get through when voice calls fail.", fact: true, why: "Texts use less network capacity, so they're more reliable on overloaded networks." },
  { statement: "You should wait for an evacuation order if someone in your home needs extra time.", fact: false, why: "Households needing extra time should leave at the warning stage." },
  { statement: "California law requires up to 100 feet of defensible space around homes in many areas.", fact: true, why: "Defensible space slows fire and gives firefighters room to work." },
  { statement: "Leaving lights on when you evacuate helps firefighters see your home in heavy smoke.", fact: true, why: "CAL FIRE recommends leaving lights on for visibility." },
];

export const ALERTS: { term: string; meaning: string }[] = [
  { term: "Evacuation Warning", meaning: "A potential threat to life and property. Prepare to leave; leave now if you need extra time." },
  { term: "Evacuation Order", meaning: "An immediate threat to life. Leave now; the area is lawfully closed." },
  { term: "Shelter in Place", meaning: "Go indoors and stay there because leaving would be more dangerous." },
  { term: "Red Flag Warning", meaning: "Critical fire weather now or soon: strong winds, low humidity, and heat." },
  { term: "Fire Weather Watch", meaning: "Critical fire weather may develop in the next 12 to 72 hours." },
];

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
