import { ALL_RESOURCES, analyzeHousehold, countyLabel, plural, type HouseholdProfile } from "./household";

// The Readiness Advisor answers from this curated question bank. Typed questions are
// matched to the closest entry; nothing is sent to an external AI service.

export type AdvisorAnswer = { paragraphs: string[]; list?: string[]; after?: string[] };
export type AdvisorContext = { profile: HouseholdProfile; score: number; firstName: string; signedIn: boolean };
export type AdvisorQuestion = {
  id: string;
  question: string;
  category: "About ReadyCA" | "Your plan";
  keywords: string[];
  related: string[];
  answer: (ctx: AdvisorContext) => AdvisorAnswer;
};

const missingResources = (p: HouseholdProfile) => ALL_RESOURCES.filter((r) => (p.resources[r.name]?.status ?? "missing") !== "ready");

export const ADVISOR_QUESTIONS: AdvisorQuestion[] = [
  // ---- Frequently asked questions ------------------------------------------
  {
    id: "what-is", category: "About ReadyCA", question: "What is ReadyCA?",
    keywords: ["what is readyca", "about", "platform", "app", "what does readyca do"],
    related: ["score-calc", "official", "personalize"],
    answer: () => ({ paragraphs: ["ReadyCA is a wildfire preparedness platform designed to help California residents assess their household readiness, identify preparedness gaps, plan evacuations, track emergency resources, and receive personalized preparedness recommendations."] }),
  },
  {
    id: "score-calc", category: "About ReadyCA", question: "How is my Readiness Score calculated?",
    keywords: ["score calculated", "readiness score", "how is score", "calculate", "framework", "points"],
    related: ["score-change", "first", "personalize"],
    answer: ({ score }) => ({
      paragraphs: ["Your Readiness Score is calculated using a transparent preparedness framework based on:"],
      list: ["Household information", "Emergency supplies", "Evacuation planning", "Communication readiness", "Transportation availability", "Pet preparedness", "Important document management", "Emergency training"],
      after: [`Your current score is ${score} out of 100. Select "Why is my score ${score}%?" on the Dashboard to see each category.`],
    }),
  },
  {
    id: "score-change", category: "About ReadyCA", question: "Why did my Readiness Score change?",
    keywords: ["score change", "score went", "score dropped", "score increased", "why did my score", "score lower", "score low"],
    related: ["score-calc", "first", "missing"],
    answer: () => ({ paragraphs: ["Your score changes as you complete preparedness activities, update your household profile, add emergency resources, create evacuation plans, or improve areas identified as preparedness gaps.", "Each completed task contributes differently depending on its impact on wildfire readiness."] }),
  },
  {
    id: "predict", category: "About ReadyCA", question: "Does ReadyCA predict whether I will be affected by a wildfire?",
    keywords: ["predict", "prediction", "will i be affected", "forecast", "will a fire", "chance"],
    related: ["official", "what-is"],
    answer: () => ({ paragraphs: ["No.", "ReadyCA does not predict future wildfire events or individual outcomes. The platform provides preparedness guidance, risk information, and planning tools to help users make informed decisions and improve readiness."] }),
  },
  {
    id: "official", category: "About ReadyCA", question: "Is ReadyCA an official emergency alert system?",
    keywords: ["official", "alert system", "emergency alert", "evacuation order", "notification", "replace"],
    related: ["predict", "what-is"],
    answer: ({ profile }) => ({ paragraphs: ["No.", "ReadyCA is an educational and preparedness platform. It is not a replacement for official emergency notifications or evacuation orders.", `Always follow instructions from local authorities, emergency management agencies, CAL FIRE, and first responders during an emergency.${profile.location.county ? ` Sign up for ${countyLabel(profile)}'s official emergency alerts so you receive orders directly.` : ""}`] }),
  },
  {
    id: "personalize", category: "About ReadyCA", question: "How does ReadyCA personalize recommendations?",
    keywords: ["personalize", "personalized", "recommendations", "tailored", "how does readyca know"],
    related: ["why-ask", "first", "missing"],
    answer: ({ profile, signedIn }) => {
      const kids = profile.members.filter((m) => m.type === "Child").length;
      const older = profile.members.filter((m) => m.type === "Older adult").length + (profile.owner.type === "Older adult" ? 1 : 0);
      const needs = [profile.owner, ...profile.members].filter((m) => m.supportNeeds).length;
      return {
        paragraphs: ["ReadyCA uses information from your household profile, including:"],
        list: ["Household size", "Children", "Older adults", "Accessibility needs", "Medical considerations", "Pets", "Transportation resources", "Existing preparedness progress"],
        after: [
          "Recommendations are tailored to help address the most important readiness gaps for your household.",
          `${signedIn ? "Your" : "This sample"} profile currently includes ${plural(1 + profile.members.length, "person")} (${plural(kids, "child")},${plural(older, "older adult")}, ${plural(needs, "person")} with support needs), ${plural(profile.pets.length, "pet")}, and ${plural(profile.vehicles.length, "vehicle")}.`,
        ],
      };
    },
  },
  {
    id: "why-ask", category: "About ReadyCA", question: "Why am I being asked about children, pets, or accessibility needs?",
    keywords: ["why ask", "children", "kids", "accessibility", "disability", "why do you need", "privacy", "sensitive"],
    related: ["personalize", "children", "pets"],
    answer: () => ({ paragraphs: ["Households have different preparedness requirements.", "A family with young children, multiple pets, or someone requiring mobility assistance may need different evacuation plans, supplies, communication strategies, and transportation options than other households."] }),
  },
  {
    id: "resources", category: "About ReadyCA", question: "How does the Household Resources section work?",
    keywords: ["household resources", "inventory", "resources section", "track supplies", "supply tracking"],
    related: ["missing", "review", "pack"],
    answer: () => ({
      paragraphs: ["The Household Resources section acts as an emergency preparedness inventory. You can track:"],
      list: ["Emergency kits", "Water supplies", "Food supplies", "First aid equipment", "Fire safety equipment", "Batteries and power sources", "Important documents", "Communication tools"],
      after: ["ReadyCA automatically identifies missing resources and explains how they may impact preparedness. Find it under My Household → Household resources."],
    }),
  },
  {
    id: "missing", category: "About ReadyCA", question: "Can ReadyCA tell me what supplies I'm missing?",
    keywords: ["missing", "supplies missing", "what am i missing", "need to buy", "what supplies", "lacking"],
    related: ["resources", "pack", "first"],
    answer: ({ profile, signedIn }) => {
      const missing = missingResources(profile);
      return {
        paragraphs: ["Yes. Based on your household profile, ReadyCA can identify missing or incomplete preparedness items and recommend actions that could improve your readiness."],
        list: missing.length ? missing.sort((a, b) => b.impact - a.impact).slice(0, 6).map((r) => `${r.name}: ${r.why}`) : undefined,
        after: missing.length
          ? [`${signedIn ? "Your" : "This sample"} inventory has ${plural(missing.length, "item")} missing or needing attention. ${missing.length > 6 ? "The highest-impact ones are listed above. " : ""}Mark items ready under My Household → Household resources.`]
          : ["Every tracked item in your inventory is marked ready. Keep checking expiration dates every 3–6 months."],
      };
    },
  },
  {
    id: "review", category: "About ReadyCA", question: "How often should I review my preparedness information?",
    keywords: ["how often", "review", "update", "check again", "when should i", "frequency"],
    related: ["missing", "score-change"],
    answer: () => ({
      paragraphs: ["ReadyCA recommends reviewing your information every 3–6 months and whenever major household changes occur, such as:"],
      list: ["Moving", "Adding family members", "Acquiring pets", "Vehicle changes", "Medical changes", "Seasonal wildfire risk increases"],
    }),
  },

  // ---- Personalized plan questions -----------------------------------------
  {
    id: "first", category: "Your plan", question: "What should I do first?",
    keywords: ["do first", "start", "priority", "where do i begin", "next step", "most important", "top"],
    related: ["missing", "score-change", "pack"],
    answer: ({ profile }) => {
      const gaps = analyzeHousehold(profile).gaps;
      if (!gaps.length) return { paragraphs: ["Your household profile has no open gaps. Review supplies and practice your evacuation route every 3–6 months."] };
      return {
        paragraphs: ["Based on your household profile, these are your highest-impact next steps:"],
        list: gaps.slice(0, 3).map((g) => `${g.title}${g.points ? ` (+${g.points} pts)` : ""}: ${g.copy}`),
        after: ["Complete these before lower-priority tasks."],
      };
    },
  },
  {
    id: "children", category: "Your plan", question: "How can I prepare my children?",
    keywords: ["children", "kids", "child", "son", "daughter", "school"],
    related: ["pack", "why-ask"],
    answer: ({ profile }) => {
      const kids = profile.members.filter((m) => m.type === "Child");
      return {
        paragraphs: ["Give each child an age-appropriate role, pack familiar comfort items, and practice your two exit routes together without creating alarm."],
        list: ["Teach them your meeting point and out-of-area contact", "Pack a comfort item, snacks, and a change of clothes", "Give school or childcare your emergency contact list", "Put a contact card in their backpack"],
        after: kids.length ? [`Your plan includes ${kids.map((k) => k.name).join(" and ")}. ${profile.contacts.some((c) => c.kind === "School / childcare") ? "You've added a school or childcare contact." : "Consider adding their school or childcare as a contact under Communication."}`] : undefined,
      };
    },
  },
  {
    id: "pets", category: "Your plan", question: "How do I prepare my pets?",
    keywords: ["pet", "pets", "dog", "cat", "animal", "carrier"],
    related: ["pack", "why-ask"],
    answer: ({ profile }) => {
      const notReady = profile.pets.filter((p) => !Object.values(p.checks).every(Boolean));
      return {
        paragraphs: ["Keep carriers, leashes, medications, food, and identification together. Confirm that your planned shelter accepts pets before an emergency."],
        after: profile.pets.length
          ? [notReady.length ? `${notReady.map((p) => p.name).join(" and ")} ${notReady.length === 1 ? "still has" : "still have"} open items on their evacuation profile under My Household → Pets.` : "All of your pets' evacuation profiles are complete."]
          : undefined,
      };
    },
  },
  {
    id: "pack", category: "Your plan", question: "What should I pack before evacuation?",
    keywords: ["pack", "go bag", "go-bag", "bring", "take with", "kit", "what to take"],
    related: ["missing", "pets", "children"],
    answer: ({ profile }) => ({
      paragraphs: ["Start with these essentials for every person:"],
      list: [
        "Water and non-perishable food for at least three days",
        "Prescriptions, medications, and glasses",
        "Identification and copies of important documents",
        "Phone chargers and a power bank",
        "N95 masks, sturdy shoes, and a change of clothes",
        ...(profile.members.some((m) => m.type === "Child") ? ["Comfort items and supplies for children"] : []),
        ...(profile.pets.length ? ["Pet food, leashes, carriers, and records"] : []),
        ...([profile.owner, ...profile.members].some((m) => m.supportNeeds) ? ["Mobility aids and medical equipment for anyone with support needs"] : []),
      ],
    }),
  },
];

export const QUESTION_BY_ID = Object.fromEntries(ADVISOR_QUESTIONS.map((q) => [q.id, q]));

const STOP = new Set(["the", "a", "an", "i", "my", "is", "do", "does", "how", "what", "to", "of", "for", "and", "or", "in", "on", "can", "should", "me", "be", "am", "are", "it", "you", "with", "will", "if"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

/** Find the preset question closest to free text. Returns null when nothing is a reasonable match. */
export function matchQuestion(text: string): AdvisorQuestion | null {
  const input = text.toLowerCase();
  const inputWords = new Set(words(text));
  if (inputWords.size === 0) return null;
  let best: AdvisorQuestion | null = null;
  let bestScore = 0;
  for (const q of ADVISOR_QUESTIONS) {
    let score = 0;
    // Whole-word/phrase matches only, so "kit" doesn't match "kitchen".
    for (const k of q.keywords) if (new RegExp(`\\b${k.replace(/[-]/g, "\\-")}s?\\b`).test(input)) score += 3 * k.split(" ").length;
    for (const w of words(q.question)) if (inputWords.has(w) || inputWords.has(w.replace(/s$/, ""))) score += 1;
    if (score > bestScore) { bestScore = score; best = q; }
  }
  return bestScore >= 3 ? best : null;
}
