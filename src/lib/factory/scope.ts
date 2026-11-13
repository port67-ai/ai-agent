import { channelById } from "./channels";
import { segments, type Project, type Segment } from "./model";

// Research scope: what kind of business this is and what each research agent should (and should not) look for.
// Pure functions and types, no AI and no I/O, so the browser, the scoping agent and the researchers share one shape.
// The scope is stored on the project record in Firestore and read back by the researchers, the preparation panel,
// the dossier and GET projects/{id}/scope, so a classification is kept and can be called at any time.

export const CATEGORIES = ["local_shop", "hospitality", "telecom", "b2b_software", "ecommerce", "professional_services", "regulated", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const SIZES = ["micro", "small", "mid", "large", "enterprise", "unknown"] as const;
export const REACHES = ["local", "regional", "national", "global", "unknown"] as const;
export const AUDIENCES = ["b2c", "b2b", "both", "unknown"] as const;
export const CONFIDENCES = ["limited", "moderate", "strong"] as const;
export type Classification = {
  category: Category;
  /** Short human label for the business, for example "Independent florist". */
  businessType: string;
  size: (typeof SIZES)[number];
  reach: (typeof REACHES)[number];
  audienceModel: (typeof AUDIENCES)[number];
  regulated: boolean;
  confidence: (typeof CONFIDENCES)[number];
  rationale: string;
};
export type SegmentScope = { questions: string[]; sourceTypes: string[]; avoid: string[]; maxPages: number };
export type ResearchScope = {
  version: number;
  source: "ai" | "template" | "manual";
  at: string;
  /** Digest of the brief this scope was made from; a different digest means the brief changed after classification. */
  briefHash: string;
  by?: string;
  provider?: string;
  model?: string;
  runId?: string;
  classification: Classification;
  /** Competitors the brief did not name, suggested for the competitor researcher. Names only. */
  competitorSet: string[];
  segments: Record<Segment, SegmentScope>;
  /** Why a template was used instead of the scoping agent, when that happened. */
  note?: string;
};
export type ScopeEntry = { version: number; at: string; source: ResearchScope["source"]; category: Category; businessType: string; size: string; model?: string };
export const CATEGORY_LABEL: Record<Category, string> = {
  local_shop: "Local shop or service",
  hospitality: "Hospitality",
  telecom: "Telecoms",
  b2b_software: "B2B software",
  ecommerce: "E-commerce",
  professional_services: "Professional services",
  regulated: "Regulated finance or health",
  other: "General business",
};

type Ctx = { business: string; channels: string[]; competitors: string[]; audience: string };
type Pack = {
  match: RegExp;
  regulated: boolean;
  audience: Classification["audienceModel"];
  pages: number;
  q: Record<Segment, (c: Ctx) => string[]>;
  sources: Record<Segment, string[]>;
  avoid: Record<Segment, string[]>;
};
const onChannels = (c: Ctx) => (c.channels.length ? ` on ${c.channels.join(", ")}` : "");
const named = (c: Ctx, fallback: string[]) => (c.competitors.length ? c.competitors.map((x) => `How does ${x} position itself, price and promote, and what do its customers praise or criticise?`).concat(fallback.slice(1)) : fallback);
const PACKS: Record<Category, Pack> = {
  local_shop: {
    match: /\b(florist|flower|bakery|butcher|deli|greengrocer|barber|hairdresser|salon|beauty|nail|spa|garage|mechanic|plumber|electrician|builder|cleaner|locksmith|gym|yoga|studio|clinic|dentist|vet|boutique|gift shop|local shop|independent shop|corner shop|tradesperson|handyman|photographer|tutor)(?:s|es)?\b/i,
    regulated: false,
    audience: "b2c",
    pages: 8,
    q: {
      brand: (c) => [`What does ${c.business} sell or do, at what prices, and which area does it serve?`, "What do its own website, Google Business profile and social pages show: hours, photos, reviews, offers?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and how active is each?`] : [])],
      customer: () => ["What do local customers praise and complain about in Google, Facebook and local review pages?", "What triggers a purchase here: occasion, convenience, price, trust, recommendation?", "How do people in the area search for and choose this kind of business?"],
      competitor: (c) => named(c, ["Who are the three closest local competitors serving the same area, excluding national chains?", "How do they price and promote, and what do their reviews praise or criticise?", `How often do they post${onChannels(c)} and what gets a response?`]),
      creative: (c) => [`Which post formats and hooks do similar local businesses use${onChannels(c)}?`, "Which seasonal or occasion-led ideas work for this category?", "What do the best local posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Business website", "Google Business profile", "Social profiles"], customer: ["Google reviews", "Facebook and local community pages", "Local review sites"], competitor: ["Competitor websites and profiles", "Local review pages"], creative: ["Peer social profiles", "Published local marketing guidance"] },
    avoid: { brand: ["National industry reports", "Analyst coverage"], customer: ["Global market research", "Enterprise buyer surveys"], competitor: ["National chains and global brands", "Financial filings"], creative: ["Global brand campaigns", "Award-show case studies"] },
  },
  hospitality: {
    match: /\b(hotel|motel|resort|hostel|guesthouse|guest house|b&b|bed and breakfast|restaurant|bistro|pub|bar|cafe|café|coffee shop|brewery|venue|catering|glamping|campsite|holiday (?:home|let|park))(?:s|es)?\b/i,
    regulated: false,
    audience: "b2c",
    pages: 10,
    q: {
      brand: (c) => [`What does ${c.business} offer (rooms, menu, experiences), at which price band, and where?`, "What do its own site, booking page and listings show about capacity, offers and photography?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and with what visible engagement?`] : [])],
      customer: () => ["What themes recur in Tripadvisor, Google and booking-site reviews: service, value, cleanliness, atmosphere, food?", "What triggers a booking or visit, and what makes people choose a rival or leave a poor review?", "How does demand change by season, occasion and visitor type?"],
      competitor: (c) => named(c, ["Which three to five venues in the same area and price band compete for the same guests?", "How do their review scores, positioning and direct-booking offers compare?", `What do they publish${onChannels(c)} and what gets engagement?`]),
      creative: (c) => [`Which visual and storytelling formats work for hospitality${onChannels(c)}: food, rooms, guests, behind the scenes?`, "Which seasonal offers and guest-content mechanics work in this category?", "What do the best venue posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Business website and booking page", "Google Business profile", "Social profiles"], customer: ["Tripadvisor and Google reviews", "Booking-site reviews", "Local and travel forums"], competitor: ["Competitor websites and listings", "Review sites"], creative: ["Peer social profiles", "Published hospitality marketing analysis"] },
    avoid: { brand: ["Global hotel group annual reports"], customer: ["Global travel trend reports"], competitor: ["Luxury global chains unless the brief names them", "Financial filings"], creative: ["Global brand campaigns"] },
  },
  telecom: {
    match: /\b(telecom|telecoms|telco|telcos|telecommunications|mobile network|network operator|carrier|broadband|isp|voip|connectivity provider|5g|fibre|fiber|mvno|communications service provider|csp)(?:s|es)?\b/i,
    regulated: true,
    audience: "b2b",
    pages: 14,
    q: {
      brand: (c) => [`What products, services and wholesale or enterprise offers does ${c.business} sell, and to which segments?`, "What footprint, scale, partnerships and public commitments does it state in its own materials?", "What regulatory, sovereignty or security positions does it publish?"],
      customer: () => ["Which roles sit on the buying committee and what do they say they need: reliability, sovereignty, price, support, speed of change?", "What do enterprise and wholesale buyers and analysts report as reasons to switch or stay?", "What objections recur in published reviews, analyst notes and trade commentary?"],
      competitor: (c) => named(c, ["Which operators and vendors compete for the same buyers in the same markets?", "How does each position its portfolio and what recent announcements or partnerships stand out?", "Where do analysts say each is strong or weak?"]),
      creative: (c) => [`How do operators and vendors in this market message${onChannels(c)}: proof points, thought leadership, events?`, "Which claims are regulated or commonly challenged in this sector?", "What formats earn senior-buyer engagement, as principles rather than copies?"],
    },
    sources: { brand: ["Company website and investor materials", "Regulator publications"], customer: ["Analyst summaries and trade press", "Enterprise review platforms"], competitor: ["Competitor websites and press releases", "Trade press", "Analyst coverage"], creative: ["Operator and vendor LinkedIn pages", "Trade event content"] },
    avoid: { brand: ["Consumer social chatter"], customer: ["Consumer app-store reviews unless the offer is consumer"], competitor: ["Consumer tariff comparison sites"], creative: ["Consumer meme formats"] },
  },
  b2b_software: {
    match: /\b(saas|software|platform|api|cloud|cybersecurity|devops|analytics|ai platform|data platform|crm|erp|it services|managed services|developer tools|app development)(?:s|es)?\b/i,
    regulated: false,
    audience: "b2b",
    pages: 12,
    q: {
      brand: (c) => [`What does ${c.business} sell, how is it packaged and priced, and what integrations and proof does it show?`, "Which customers, case studies, certifications and security claims does it publish?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and with what results?`] : [])],
      customer: () => ["What jobs do buyers hire this kind of product for, and what do reviewers praise and complain about?", "What triggers a switch or a first purchase, and which roles are involved?", "Which alternatives do buyers shortlist?"],
      competitor: (c) => named(c, ["Which products do buyers shortlist alongside it?", "How does each position, price and prove its claims?", "What do review platforms and analysts say about each?"]),
      creative: (c) => [`How do B2B software companies in this category market${onChannels(c)}: formats, proof, thought leadership?`, "Which demand-generation conventions work for this buyer?", "What do the best posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Product website, pricing and docs", "Case studies"], customer: ["Software review platforms", "Practitioner communities"], competitor: ["Competitor product sites and pricing pages", "Review platforms", "Analyst coverage"], creative: ["Competitor and peer LinkedIn pages", "Published B2B marketing analysis"] },
    avoid: { brand: ["Local business listings"], customer: ["Consumer retail reviews"], competitor: ["Consumer products"], creative: ["Consumer retail campaigns"] },
  },
  ecommerce: {
    match: /\b(e-?commerce|online store|online shop|webshop|shopify|direct[- ]to[- ]consumer|d2c|dtc|marketplace|subscription box|fashion brand|apparel|skincare|cosmetics|homeware|furniture retailer)(?:s|es)?\b/i,
    regulated: false,
    audience: "b2c",
    pages: 10,
    q: {
      brand: (c) => [`What range does ${c.business} sell, at which price points, with which shipping and returns promise?`, "What is its stated difference from alternatives, and what proof does it show?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and with what results?`] : [])],
      customer: () => ["What do buyers praise and complain about in product reviews and forums: quality, fit, delivery, returns?", "What triggers a purchase and what causes basket abandonment?", "Which alternatives do buyers compare?"],
      competitor: (c) => named(c, ["Which shops and brands compete for the same buyers?", "How do their price, range and delivery promise compare?", "What do reviews say about each?"]),
      creative: (c) => [`Which product, creator and user-content formats work for this category${onChannels(c)}?`, "Which offer mechanics and seasonal hooks work?", "What do the best posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Store website and product pages", "Social profiles"], customer: ["Product reviews", "Review sites and forums"], competitor: ["Competitor stores and marketplaces", "Review sites"], creative: ["Competitor and creator social profiles", "Published social commerce analysis"] },
    avoid: { brand: ["B2B analyst reports"], customer: ["B2B review platforms"], competitor: ["Wholesale and B2B suppliers"], creative: ["B2B thought-leadership formats"] },
  },
  professional_services: {
    match: /\b(consultancy|consulting|accountant|accountancy|solicitor|law firm|lawyers?|advisory|recruitment|recruiter|architect|marketing agency|creative agency|pr agency|financial adviser|surveyor|engineering firm|training provider)(?:s|es)?\b/i,
    regulated: false,
    audience: "both",
    pages: 10,
    q: {
      brand: (c) => [`Which services does ${c.business} offer, to whom, under which fee model and credentials?`, "Which case studies, clients and results does it publish?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and with what results?`] : [])],
      customer: () => ["What do clients say in testimonials, directories and reviews, and what do prospects worry about: trust, expertise, cost certainty?", "How do buyers find and shortlist advisers in this field?", "What triggers a first enquiry?"],
      competitor: (c) => named(c, ["Which firms compete for the same clients, by specialism and size?", "How do they position expertise and proof?", "What do clients and directories say about each?"]),
      creative: (c) => [`Which thought-leadership and case-study formats earn trust${onChannels(c)}?`, "Which claims are restricted or commonly challenged in this profession?", "What do the best posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Firm website and case studies", "Professional profiles"], customer: ["Professional directories and review pages", "Client testimonials"], competitor: ["Competitor firm sites", "Directories"], creative: ["Peer LinkedIn pages", "Published professional-services marketing analysis"] },
    avoid: { brand: ["Consumer retail sources"], customer: ["Consumer product reviews"], competitor: ["Consumer brands"], creative: ["Consumer meme formats"] },
  },
  regulated: {
    match: /\b(bank|banking|insurer|insurance|fintech|lender|lending|mortgage|credit union|investment|wealth management|pension|pharmacy|pharmaceutical|medical device|healthcare provider|private clinic|hospital|telehealth)(?:s|es)?\b/i,
    regulated: true,
    audience: "both",
    pages: 10,
    q: {
      brand: (c) => [`What products or services does ${c.business} offer, who authorises or regulates it, and what disclosures does it publish?`, "Which proof, credentials and customer outcomes does it state?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and how?`] : [])],
      customer: () => ["What do customers say about trust, fees, service and outcomes in reviews and forums?", "What triggers a first purchase or switch, and what do customers fear?", "Which alternatives do customers compare?"],
      competitor: (c) => named(c, ["Which providers compete for the same customers?", "How does each position trust, price and proof?", "What do customers and regulators say about each?"]),
      creative: (c) => [`Which formats build trust in this sector${onChannels(c)}?`, "Which claims are restricted by the regulator, and which wording is commonly challenged?", "What do the best posts have in common, as principles rather than copies?"],
    },
    sources: { brand: ["Company website and regulatory disclosures", "Regulator register"], customer: ["Independent review sites", "Consumer forums"], competitor: ["Competitor sites and disclosures", "Regulator publications"], creative: ["Peer social profiles", "Regulator advertising guidance"] },
    avoid: { brand: ["Unverifiable performance claims"], customer: ["Unverified testimonials"], competitor: ["Unverifiable performance claims"], creative: ["Performance or return claims"] },
  },
  other: {
    match: /$^/,
    regulated: false,
    audience: "unknown",
    pages: 10,
    q: {
      brand: (c) => [`What exactly does ${c.business} offer, to whom and at what price?`, "What proof does the business show: customers, numbers, awards, press?", "What tone and visual style does the business already use?", ...(c.channels.length ? [`Which of ${c.channels.join(", ")} does it already use, and with what visible results?`] : [])],
      customer: (c) => ["What makes buyers choose in this category, and what makes them hesitate?", c.audience ? `How does this audience describe their problem in their own words: ${c.audience.slice(0, 120)}?` : "Who actually buys in this category, and what words do they use?", "Which alternatives do customers weigh before buying?"],
      competitor: (c) => named(c, ["Who are the three to five closest competitors or substitutes?", "How does each position itself and where are they silent?", "What do customers praise and complain about for each?"]),
      creative: (c) => [`Which formats, hooks and tones work for ${c.audience ? "this audience" : "this category"}${onChannels(c)}?`, "What native conventions should the creative follow on each channel?"],
    },
    sources: { brand: ["Business website", "Social profiles"], customer: ["Independent reviews and forums"], competitor: ["Competitor websites and profiles"], creative: ["Peer social profiles", "Published channel guidance"] },
    avoid: { brand: [], customer: [], competitor: [], creative: [] },
  },
};
const words = (s: string) => String(s || "").toLowerCase();
const list = (s: string) => [...new Set(String(s || "").split(/[\n,;]+/).map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 80))].slice(0, 6);

/** Business category from the brief's own words. Deterministic and free; the scoping agent does this better when a model is set. */
export function classifyByRules(brief: Partial<Record<string, string>>): Classification {
  const text = [brief.business, brief.description, brief.objective, brief.audience].map((x) => String(x ?? "")).join(" . ");
  const order: Category[] = ["telecom", "regulated", "hospitality", "local_shop", "b2b_software", "ecommerce", "professional_services"];
  const category = order.find((c) => PACKS[c].match.test(text)) || "other";
  const t = words(text);
  const size: Classification["size"] = /\b(multinational|global leader|fortune|tier[- ]?1|enterprise|plc|listed)\b/.test(t) ? "enterprise" : /\b(national|nationwide|chain|group|hundreds of|thousands of)\b/.test(t) ? "mid" : /\b(sole trader|freelance|one[- ]person|home-based|solo)\b/.test(t) ? "micro" : /\b(independent|family[- ]run|local|small|boutique|neighbourhood|village|town)\b/.test(t) ? "small" : "unknown";
  const reach: Classification["reach"] = /\b(global|worldwide|international|multinational|countries)\b/.test(t) ? "global" : /\b(national|nationwide|uk[- ]wide|country[- ]wide)\b/.test(t) ? "national" : /\b(regional|county|state-wide)\b/.test(t) ? "regional" : /\b(local|neighbourhood|village|town|city|independent)\b/.test(t) ? "local" : "unknown";
  const b2b = /\b(b2b|businesses|companies|enterprises?|operators?|procurement|teams|organisations|organizations)\b/.test(t);
  const b2c = /\b(b2c|consumers?|families|shoppers|guests|diners|homeowners|households|individuals|residents)\b/.test(t);
  const audienceModel: Classification["audienceModel"] = b2b && b2c ? "both" : b2b ? "b2b" : b2c ? "b2c" : PACKS[category].audience;
  return {
    category,
    businessType: CATEGORY_LABEL[category],
    size,
    reach,
    audienceModel,
    regulated: PACKS[category].regulated,
    confidence: category === "other" ? "limited" : "moderate",
    rationale: category === "other" ? "No category keywords in the brief, so general questions are used." : `Matched ${CATEGORY_LABEL[category].toLowerCase()} wording in the brief.`,
  };
}
const adjustPages = (pages: number, size: Classification["size"]) => (size === "micro" || size === "small" ? Math.min(pages, 8) : size === "large" || size === "enterprise" ? Math.max(pages, 14) : pages);
/** The question pack for a classification: used as the fallback and as the starting point a producer can edit. */
export function scopeFromClassification(p: Pick<Project, "brief" | "channels">, classification: Classification): Pick<ResearchScope, "classification" | "competitorSet" | "segments"> {
  const raw = (p.brief || {}) as Partial<Record<string, string>>;
  const pack = PACKS[classification.category] || PACKS.other;
  const ctx: Ctx = { business: String(raw.business || "the business").trim() || "the business", channels: (p.channels || []).map(channelById).filter((c): c is NonNullable<typeof c> => !!c).map((c) => c.name), competitors: list(String(raw.competitors || "")), audience: String(raw.audience || "").trim() };
  const out = {} as Record<Segment, SegmentScope>;
  for (const s of segments) out[s] = { questions: pack.q[s](ctx).slice(0, 6), sourceTypes: [...pack.sources[s]], avoid: [...pack.avoid[s]], maxPages: adjustPages(pack.pages, classification.size) };
  return { classification, competitorSet: [], segments: out };
}
/** Deterministic scope with no AI cost. */
export function templateScope(p: Pick<Project, "brief" | "channels">, meta: { briefHash: string; version: number; at?: string; note?: string }): ResearchScope {
  return { version: meta.version, source: "template", at: meta.at || new Date().toISOString(), briefHash: meta.briefHash, ...scopeFromClassification(p, classifyByRules((p.brief || {}) as Partial<Record<string, string>>)), ...(meta.note ? { note: meta.note.slice(0, 240) } : {}) };
}

// Validation: the same checks run on model output and on a producer's edit. Anything malformed is rejected, never repaired silently.
const clean = (v: unknown, max: number): string => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const noLink = (s: string) => !/(https?:|www\.|:\/\/)/i.test(s);
function items(v: unknown, label: string, min: number, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) throw new Error(`${label} must be a list`);
  const out = [...new Set(v.map((x) => clean(x, maxLen)).filter((x) => x.length >= 3 && noLink(x)))].slice(0, maxItems);
  if (out.length < min) throw new Error(`${label} needs at least ${min} entr${min === 1 ? "y" : "ies"}`);
  return out;
}
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], label: string): T => {
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new Error(`${label} is not one of: ${allowed.join(", ")}`);
  return v as T;
};
export type ScopeInput = Pick<ResearchScope, "classification" | "competitorSet" | "segments">;
export function validateScope(raw: unknown): ScopeInput {
  if (!raw || typeof raw !== "object") throw new Error("Scope must be an object");
  const o = raw as { classification?: Record<string, unknown>; competitorSet?: unknown; segments?: Record<string, Record<string, unknown>> };
  const c = o.classification;
  if (!c || typeof c !== "object") throw new Error("Classification is missing");
  const classification: Classification = {
    category: oneOf(c.category, CATEGORIES, "category"),
    businessType: clean(c.businessType, 60) || "Business",
    size: oneOf(c.size, SIZES, "size"),
    reach: oneOf(c.reach, REACHES, "reach"),
    audienceModel: oneOf(c.audienceModel, AUDIENCES, "audience model"),
    regulated: c.regulated === true,
    confidence: oneOf(c.confidence, CONFIDENCES, "confidence"),
    rationale: clean(c.rationale, 400),
  };
  const out = {} as Record<Segment, SegmentScope>;
  for (const s of segments) {
    const seg = o.segments?.[s];
    if (!seg || typeof seg !== "object") throw new Error(`Scope for ${s} is missing`);
    const pages = Number(seg.maxPages);
    out[s] = {
      questions: items(seg.questions, `${s} questions`, 2, 6, 220),
      sourceTypes: items(seg.sourceTypes ?? [], `${s} source types`, 0, 6, 90),
      avoid: items(seg.avoid ?? [], `${s} out of scope`, 0, 6, 120),
      maxPages: Number.isFinite(pages) ? Math.max(4, Math.min(20, Math.round(pages))) : 10,
    };
  }
  const competitorSet = Array.isArray(o.competitorSet) ? [...new Set(o.competitorSet.map((x) => clean(x, 80)).filter((x) => x.length >= 2 && noLink(x)))].slice(0, 6) : [];
  return { classification, competitorSet, segments: out };
}
/** Fields customers may see: the classification and what will be asked, never which model or run produced it. */
export function scopeForCustomer(s: ResearchScope): Omit<ResearchScope, "provider" | "model" | "runId" | "by" | "note"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { provider, model, runId, by, note, ...rest } = s;
  return rest;
}
