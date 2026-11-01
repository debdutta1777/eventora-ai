import { addDays, format, parseISO } from "date-fns";

import {
  EVENT_TYPE_LABELS,
  type EventBrief,
  type EventRecord,
  type EventType,
  type Idea,
  type Task,
  type TaskCategory,
} from "./types";
import { daysUntil, todayISO } from "./format";

/**
 * Deterministic event-type templates. Everything the wizard and the sample
 * events generate comes from here — no randomness, no live AI.
 */

interface BudgetTemplate {
  name: string;
  pct: number;
}

interface TaskTemplate {
  title: string;
  category: TaskCategory;
  offsetDays: number;
}

interface VendorGroupTemplate {
  name: string;
  items: { title: string; note: string }[];
}

interface IdeaTemplate {
  title: string;
  explanation: string;
  costRangeLabel: string;
  steps: string[];
}

interface EventTypeTemplate {
  budget: BudgetTemplate[];
  tasks: TaskTemplate[];
  vendors: VendorGroupTemplate[];
  ideas: IdeaTemplate[];
  themeSuggestions: string[];
}

export const CONTINGENCY_PCT = 5;

export const TYPE_EXAMPLES: Record<EventType, { blurb: string }> = {
  wedding: {
    blurb: "Multi-day celebrations with venue, catering, decor and guest logistics to balance.",
  },
  birthday: { blurb: "Fun, focused parties — cake, food, entertainment and return gifts." },
  community: { blurb: "Large gatherings with permissions, stalls, stage and volunteer crews." },
};

const WEDDING: EventTypeTemplate = {
  budget: [
    { name: "Venue", pct: 25 },
    { name: "Catering", pct: 22 },
    { name: "Decor & florals", pct: 14 },
    { name: "Attire", pct: 10 },
    { name: "Photography", pct: 10 },
    { name: "Music & entertainment", pct: 8 },
    { name: "Guest logistics", pct: 6 },
  ],
  tasks: [
    { title: "Book the venue and lock the date", category: "Venue", offsetDays: -180 },
    { title: "Shortlist caterers and plan a menu tasting", category: "Food", offsetDays: -150 },
    { title: "Send save-the-dates", category: "Guests", offsetDays: -120 },
    { title: "Book the photography team", category: "Program", offsetDays: -120 },
    { title: "Finalise the decor theme with the florist", category: "Decor", offsetDays: -90 },
    { title: "Order wedding attire and book tailoring", category: "Program", offsetDays: -75 },
    { title: "Send invitations and track RSVPs", category: "Guests", offsetDays: -60 },
    { title: "Arrange guest transport between venues", category: "Logistics", offsetDays: -45 },
    { title: "Final dress fitting", category: "Program", offsetDays: -21 },
    { title: "Confirm final headcount with the caterer", category: "Food", offsetDays: -7 },
    { title: "Pay the venue balance", category: "Finance", offsetDays: -3 },
    { title: "Supervise decor setup", category: "Decor", offsetDays: -1 },
  ],
  vendors: [
    {
      name: "Venue",
      items: [
        {
          title: "Visit 3 shortlisted venues before booking",
          note: "Sample note: ask about in-house catering rules, room blocks and overtime charges.",
        },
        {
          title: "Review the venue contract for hidden costs",
          note: "Sample note: check service fees, cleanup charges and the cancellation clause.",
        },
      ],
    },
    {
      name: "Catering",
      items: [
        {
          title: "Collect per-plate quotes from 3 caterers",
          note: "Sample note: confirm taxes, service-staff ratio and whether tasting is included.",
        },
        {
          title: "Plan a menu tasting with the top choice",
          note: "Sample note: note down the two dishes guests are most likely to remember.",
        },
      ],
    },
    {
      name: "Decor",
      items: [
        {
          title: "Collect mood boards from 2 decorators",
          note: "Sample note: agree on 3 anchor elements rather than a long wish-list.",
        },
        {
          title: "Confirm what the venue already provides",
          note: "Sample note: some venues include basic stage and flower decor.",
        },
      ],
    },
    {
      name: "Photography",
      items: [
        {
          title: "Review full galleries, not just highlights",
          note: "Sample note: ask how many edited photos are delivered and in what timeline.",
        },
        {
          title: "Decide between candid-only and full coverage",
          note: "Sample note: candid teams are lighter but may miss formal group shots.",
        },
      ],
    },
    {
      name: "Music & entertainment",
      items: [
        {
          title: "Check whether the venue provides a sound system",
          note: "Sample note: renting separately often costs less than the venue's vendor.",
        },
      ],
    },
  ],
  ideas: [
    {
      title: "Golden-hour couple portraits",
      explanation:
        "A short 20-minute portrait slot during the best light of the day gives you the photos you'll frame — without a separate photo session.",
      costRangeLabel: "₹5,000–₹15,000",
      steps: [
        "Check sunset time for your date and venue",
        "Block a 20-minute slot in the day's schedule",
        "Tell the photographer which 3 backgrounds you want",
      ],
    },
    {
      title: "Marigold and jasmine entrance",
      explanation:
        "A fresh-flower entrance arch photographs beautifully and costs far less than full floral sets if used in one focal spot.",
      costRangeLabel: "₹10,000–₹30,000",
      steps: [
        "Ask the decorator for a single-arch quote",
        "Reuse the arch flowers for the stage backdrop",
        "Schedule setup for early morning to avoid heat wilt",
      ],
    },
    {
      title: "Live acoustic sangeet set",
      explanation:
        "A 2-piece acoustic band for the sangeet keeps the evening warm and conversational, and usually costs less than a full DJ setup.",
      costRangeLabel: "₹20,000–₹50,000",
      steps: [
        "Shortlist bands with wedding experience",
        "Share your must-play list in advance",
        "Confirm power and sound requirements with the venue",
      ],
    },
    {
      title: "Handwritten welcome notes",
      explanation:
        "A small handwritten card at each seat sets the tone for the weekend and doubles as a keepsake for close family.",
      costRangeLabel: "₹2,000–₹6,000",
      steps: [
        "Draft one short note template",
        "Ask 3–4 friends to help write them",
        "Pair each card with a small locally-made sweet",
      ],
    },
  ],
  themeSuggestions: [
    "A pastel garden theme with ivory linens and soft greenery",
    "A heritage courtyard theme with brass lanterns and marigold",
    "A minimal monochrome theme with single-stem floral arrangements",
  ],
};

const BIRTHDAY: EventTypeTemplate = {
  budget: [
    { name: "Venue", pct: 15 },
    { name: "Food & cake", pct: 25 },
    { name: "Decor", pct: 15 },
    { name: "Entertainment", pct: 15 },
    { name: "Return gifts", pct: 10 },
    { name: "Photography", pct: 10 },
    { name: "Supplies", pct: 5 },
  ],
  tasks: [
    { title: "Book the party venue", category: "Venue", offsetDays: -45 },
    { title: "Order the cake", category: "Food", offsetDays: -21 },
    { title: "Send invitations", category: "Guests", offsetDays: -14 },
    { title: "Book the entertainer or games host", category: "Program", offsetDays: -14 },
    { title: "Buy return gifts", category: "Guests", offsetDays: -7 },
    { title: "Plan the decor and balloon setup", category: "Decor", offsetDays: -5 },
    { title: "Confirm final food count", category: "Food", offsetDays: -3 },
    { title: "Pick up the cake", category: "Food", offsetDays: 0 },
    { title: "Set up the venue", category: "Logistics", offsetDays: 0 },
  ],
  vendors: [
    {
      name: "Venue",
      items: [
        {
          title: "Check party packages vs bare venue rental",
          note: "Sample note: packages often include basic decor and a host.",
        },
      ],
    },
    {
      name: "Food & cake",
      items: [
        {
          title: "Collect cake design quotes",
          note: "Sample note: eggless and fondant options change the price noticeably.",
        },
        {
          title: "Decide catering: buffet vs live counters",
          note: "Sample note: live counters delight kids but need more space and time.",
        },
      ],
    },
    {
      name: "Entertainment",
      items: [
        {
          title: "Shortlist a magician, mascot or games host",
          note: "Sample note: ask for a 45-minute set with audience participation.",
        },
      ],
    },
    {
      name: "Decor",
      items: [
        {
          title: "Get a balloon-arch and backdrop quote",
          note: "Sample note: a strong photo backdrop is worth more than scattered decor.",
        },
      ],
    },
  ],
  ideas: [
    {
      title: "Themed photo booth",
      explanation:
        "A small corner with 4–6 props matching the theme keeps kids busy between activities and gives parents great photos.",
      costRangeLabel: "₹5,000–₹15,000",
      steps: [
        "Pick 5 props that match the theme",
        "Print a simple backdrop or use a decorated wall",
        "Assign one adult to keep props tidy",
      ],
    },
    {
      title: "Memory-lane slideshow",
      explanation:
        "A 5-minute slideshow of the year's photos is free to make and becomes the emotional highlight of the party.",
      costRangeLabel: "₹0–₹2,000",
      steps: [
        "Collect 40–60 photos from family",
        "Add captions with milestone dates",
        "Test it on the venue's screen beforehand",
      ],
    },
    {
      title: "Mocktail bar with custom labels",
      explanation:
        "Three mocktails with playful name cards make kids feel grown-up and cost less than packaged drinks.",
      costRangeLabel: "₹3,000–₹8,000",
      steps: [
        "Choose 3 easy mocktails",
        "Print small name cards for each",
        "Pre-batch the mixes in dispensers",
      ],
    },
    {
      title: "DIY favour station",
      explanation:
        "Let guests assemble their own take-home jar of treats — it doubles as an activity and halves gifting waste.",
      costRangeLabel: "₹4,000–₹10,000",
      steps: [
        "Buy jars, 3 fill options and scoops",
        "Add a one-line instruction card",
        "Keep refill stock hidden behind the table",
      ],
    },
  ],
  themeSuggestions: [
    "A space-adventure theme with glow-in-the-dark stars",
    "A jungle-safari theme with animal-print bunting",
    "An art-studio theme where the decor is painted during the party",
  ],
};

const COMMUNITY: EventTypeTemplate = {
  budget: [
    { name: "Venue & permissions", pct: 15 },
    { name: "Food stalls", pct: 20 },
    { name: "Stage & sound", pct: 15 },
    { name: "Decor", pct: 10 },
    { name: "Publicity", pct: 10 },
    { name: "Equipment", pct: 10 },
    { name: "Volunteers & logistics", pct: 15 },
  ],
  tasks: [
    { title: "Reserve the community ground", category: "Venue", offsetDays: -90 },
    { title: "Get society and police approvals", category: "Logistics", offsetDays: -75 },
    { title: "Recruit and brief volunteers", category: "Program", offsetDays: -60 },
    { title: "Book sound and lighting", category: "Logistics", offsetDays: -45 },
    { title: "Open resident registrations", category: "Guests", offsetDays: -30 },
    { title: "Confirm stall vendors", category: "Food", offsetDays: -21 },
    { title: "Print posters and banners", category: "Publicity", offsetDays: -14 },
    { title: "Publish the event schedule", category: "Publicity", offsetDays: -10 },
    { title: "Run a full rehearsal", category: "Program", offsetDays: -3 },
    { title: "Set up stage, chairs and signage", category: "Logistics", offsetDays: -1 },
  ],
  vendors: [
    {
      name: "Venue & permissions",
      items: [
        {
          title: "File permission applications early",
          note: "Sample note: societies and police clearances can take 3–4 weeks.",
        },
        {
          title: "Map power and water points on the ground",
          note: "Sample note: stalls and sound both need dedicated circuits.",
        },
      ],
    },
    {
      name: "Food stalls",
      items: [
        {
          title: "Invite resident-run stalls first",
          note: "Sample note: home cooks draw the biggest crowds at community events.",
        },
        {
          title: "Agree on stall fees and cleanliness rules",
          note: "Sample note: put waste disposal responsibility in writing.",
        },
      ],
    },
    {
      name: "Stage & sound",
      items: [
        {
          title: "Get quotes for stage, sound and lighting together",
          note: "Sample note: bundled quotes usually beat three separate vendors.",
        },
        {
          title: "Plan a backup for rain on the stage",
          note: "Sample note: a tarpaulin and cable covers are the minimum.",
        },
      ],
    },
    {
      name: "Publicity",
      items: [
        {
          title: "Draft poster and WhatsApp announcement copy",
          note: "Sample note: one clear poster beats five different designs.",
        },
      ],
    },
  ],
  ideas: [
    {
      title: "Potluck dessert table",
      explanation:
        "Residents contribute their signature desserts — zero stall cost and an instant conversation starter.",
      costRangeLabel: "₹0–₹5,000",
      steps: [
        "Collect dessert sign-ups in the society group",
        "Add ingredient cards for allergy awareness",
        "Arrange tables near the main entrance",
      ],
    },
    {
      title: "Kids' games corner",
      explanation:
        "Five simple paid-entry games (ring toss, lemon spoon) run by volunteers can fund their own prizes.",
      costRangeLabel: "₹3,000–₹8,000",
      steps: [
        "Pick 5 games with cheap reusable materials",
        "Roster 2 volunteers per game",
        "Price tokens to roughly cover prizes",
      ],
    },
    {
      title: "Local talent open mic",
      explanation:
        "A one-hour open mic for residents — singers, poets, kids — gives the event its own story.",
      costRangeLabel: "₹0–₹3,000",
      steps: [
        "Collect 8–10 acts via a sign-up form",
        "Cap each act at 5 minutes",
        "Schedule it before the headline performance",
      ],
    },
    {
      title: "Recycled-material decor",
      explanation:
        "Decor made from residents' newspaper, bottles and sarees cuts cost and becomes a workshop in itself.",
      costRangeLabel: "₹2,000–₹6,000",
      steps: [
        "Collect materials a week ahead",
        "Host one decor-making evening with volunteers",
        "Photograph the results for next year's publicity",
      ],
    },
  ],
  themeSuggestions: [
    "A winter village mela with bunting and fairy lights",
    "A harvest-festival theme with hay bales and terracotta",
    "A retro-carnival theme with striped tents and posters",
  ],
};

const TEMPLATES: Record<EventType, EventTypeTemplate> = {
  wedding: WEDDING,
  birthday: BIRTHDAY,
  community: COMMUNITY,
};

export function getTemplate(type: EventType): EventTypeTemplate {
  return TEMPLATES[type];
}

let fallbackSequence = 0;

/** Full identifiers remain unique when randomUUID is unavailable on HTTP previews. */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(++fallbackSequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

/** Shared by review and creation: round integer paise once, then reconcile exactly. */
export function allocateTemplateBudget(type: EventType, totalPaise: number) {
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 1)
    throw new Error("Enter a positive budget in integer paise.");
  const total = BigInt(totalPaise);
  const contingency = (total * BigInt(CONTINGENCY_PCT) + 50n) / 100n;
  const values = TEMPLATES[type].budget.map((c) => ({
    ...c,
    amount: (total * BigInt(c.pct) + 50n) / 100n,
  }));
  const largest = values.reduce((a, b) => (b.amount > a.amount ? b : a));
  let drift = total - contingency - values.reduce((sum, c) => sum + c.amount, 0n);
  if (drift >= 0n) largest.amount += drift;
  else {
    // Tiny budgets can round several categories up; remove excess without going negative.
    for (const category of [...values].sort((a, b) =>
      a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1,
    )) {
      const remove = category.amount < -drift ? category.amount : -drift;
      category.amount -= remove;
      drift += remove;
      if (drift === 0n) break;
    }
  }
  return {
    categories: values.map(({ amount, ...c }) => ({ ...c, allocatedPaise: Number(amount) })),
    contingencyPaise: Number(contingency),
  };
}

/** Builds the full planning data set for a brief. Deterministic per event type. */
export function createEventFromBrief(brief: EventBrief): EventRecord {
  const template = TEMPLATES[brief.type];
  const allocation = allocateTemplateBudget(brief.type, brief.totalBudgetPaise);
  const categories = allocation.categories.map((c) => ({
    id: newId("cat"),
    name: c.name,
    allocatedPaise: c.allocatedPaise,
    expenses: [] as { id: string; label: string; amountPaise: number }[],
  }));

  const tasks: Task[] = template.tasks.map((t) => ({
    id: newId("task"),
    title: t.title,
    category: t.category,
    // Compress preparation into the remaining window; retain event date as upper bound.
    dueDate: scheduledTaskDate(brief.date, t.offsetDays),
    completed: false,
  }));

  const now = new Date().toISOString();
  return {
    id: newId("event"),
    brief,
    budget: {
      categories,
      contingencyPaise: allocation.contingencyPaise,
      contingencyLabel: "Contingency",
    },
    tasks,
    vendorGroups: template.vendors.map((g) => ({
      id: newId("vg"),
      name: g.name,
      items: g.items.map((i) => ({
        id: newId("vi"),
        title: i.title,
        note: i.note,
        status: "needed" as const,
        done: false,
      })),
    })),
    ideas: template.ideas.map((i): Idea => ({
      id: newId("idea"),
      title: i.title,
      explanation: i.explanation,
      costRangeLabel: i.costRangeLabel,
      steps: [...i.steps],
      saved: false,
    })),
    createdAt: now,
    updatedAt: now,
    isSample: false,
  };
}

/** Calendar-date comparisons avoid daylight-saving or timezone rounding drift. */
function scheduledTaskDate(eventDate: string, offsetDays: number): string {
  const proposed = format(addDays(parseISO(eventDate), offsetDays), "yyyy-MM-dd");
  const earliest = todayISO();
  return proposed < earliest ? (eventDate < earliest ? eventDate : earliest) : proposed;
}

/** Display copy used wherever generated plans are shown: they come from templates, not live AI. */
export const DEMO_PLAN_NOTICE =
  "Starter plan — generated from templates. Save to account to request AI suggestions.";

/** How far ahead each event type's template starts preparing, in days. */
export const PREP_LEAD_DAYS: Record<EventType, number> = {
  wedding: 180,
  birthday: 45,
  community: 90,
};

/** Warning shown when the chosen date leaves less preparation time than the template expects. */
export function prepLeadWarning(type: EventType, eventDateISO: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDateISO)) return null;
  const days = daysUntil(eventDateISO);
  if (!Number.isFinite(days)) return null;
  const lead = PREP_LEAD_DAYS[type];
  if (days >= lead) return null;
  const label = EVENT_TYPE_LABELS[type].toLowerCase();
  if (days < 0) {
    return `The date you picked has already passed. Choose a date in the future.`;
  }
  return `Only ${days} ${days === 1 ? "day" : "days"} left until your ${label} — this ${label} template allows about ${lead} days of preparation. Consider moving the date or compressing the plan's timeline.`;
}
