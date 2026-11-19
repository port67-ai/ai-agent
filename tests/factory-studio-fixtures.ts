// Shared fixtures for the studio piece B tests (CHG-0098). No test runs from this file.
import { createStudioProject, strategyHash, transition } from "../src/lib/factory/engine";
import type { HookPackDraft, ScenePackDraft } from "../src/lib/factory/studio-preproduction";
import type { Principal, Project } from "../src/lib/factory/model";

export const op: Principal = { role: "operator", workspaceId: "w", subject: "producer" };
export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 3)]);
/** A studio project with an approved direction (two key messages) and gate 2 approved: Pre-production is open. */
export function preproductionProject(offer: "scene_pack" | "hook_pack", id: string, actor: Principal = op): Project {
  const op = actor;
  let p = createStudioProject({ offer, brief: { client: { businessName: "Nash's Bakery", website: "https://nashs.example.com", approverName: "Ann", approverEmail: "ann@example.com" }, project: { name: "Spring" }, product: { names: "Sourdough, Rye", benefits: "Fermented for 48 hours", offer: "10% off the first order", cta: "Order today" }, brandKit: { colours: ["#aa3300", "#f5f1ea"], tone: "Warm", avoid: "SENTINEL-AVOID never mention supermarkets" } } }, op, id);
  p = transition(p, { type: "approveStudioGateWithNote", stage: "intake", note: "Assets later" }, op);
  p = transition(p, { type: "authoriseAI", confirm: true }, op);
  p = transition(p, { type: "addSource", segment: "brand", title: "About", url: "https://nashs.example.com/about", excerpt: "Nash's bakes every morning and ferments sourdough for 48 hours." }, op);
  const src = p.sources[0].id;
  p = transition(p, { type: "reviewSource", id: src, status: "supported" }, op);
  p = transition(p, { type: "addInsight", title: "Freshness", interpretation: "Customers choose bread baked that morning.", sourceIds: [src] }, op);
  p = transition(p, { type: "draftStrategy", message: "Bread worth waking up for", keyMessages: [{ message: "Baked every morning", proof: "Nash's bakes every morning", sourceIds: [src] }, { message: "Fermented for 48 hours", proof: "Ferments sourdough for 48 hours", sourceIds: [src] }] }, op);
  p = transition(p, { type: "shareStrategy" }, op);
  p = transition(p, { type: "approveStrategy", hash: strategyHash(p.strategies.at(-1)!) }, op);
  return transition(p, { type: "approveStudioGate", stage: "strategy" }, op);
}
export function sceneDraft(products = ["Sourdough", "Rye"], themes = 3): ScenePackDraft {
  const t = Array.from({ length: themes }, (_, i) => ({ title: `Theme ${i + 1}`, message: i === 0 ? "Fermented for 48 hours" : "Baked every morning", keyMessage: i === 0 ? 2 : 1 }));
  return {
    moodboard: { palette: [{ hex: "#F5F1EA", use: "Background" }, { hex: "#2b2b2b", use: "Shadows" }, { hex: "#c8a165", use: "Crust" }], lighting: "Low morning window light from the left", surfaces: "Linen, oak boards", props: ["Butter knife", "Linen cloth"], moodWords: ["warm", "quiet", "fresh"] },
    continuity: { lighting: "Soft window key from camera left", cameraBody: "Full-frame camera", lens: "50mm prime at f/2.8", grade: "Warm, gentle contrast", rules: "Product always in focus; same table height" },
    themes: t,
    scenes: products.flatMap((product) => t.map((theme, i) => ({ product, theme: i + 1, title: `${product} ${theme.title}`, description: `${product} on an oak board at breakfast`, placement: "Centre, slightly below the middle", setting: "Kitchen table", message: theme.message, keyMessage: theme.keyMessage }))),
  };
}
export function hookDraft(): HookPackDraft {
  const styles = ["visual_metaphor", "close_up", "split_screen", "pattern_interrupt"] as const;
  return {
    script: { beats: [{ start: 0, end: 5, visual: "Dough rising", voiceover: "This loaf took two days.", onScreen: "Fermented for 48 hours", keyMessage: 2 }, { start: 5, end: 12, visual: "Oven at dawn", voiceover: "Baked every morning.", onScreen: "Baked every morning", keyMessage: 1 }, { start: 12, end: 20, visual: "Breakfast table", voiceover: "Order today.", onScreen: "Order today", keyMessage: 1 }], claims: [{ text: "Fermented for 48 hours", keyMessage: 2 }] },
    narratives: [1, 2, 3].map((n) => ({ title: `Story ${n}`, angle: `Angle ${n}`, keyMessage: n === 1 ? 2 : 1, proof: "Nash's bakes every morning", hooks: styles.map((style) => ({ style, visual: `Hook visual ${style}`, voiceover: "Wait for the crunch.", onScreen: "Listen" })) })),
    shotlist: [{ shot: "Dough", description: "Dough rising", framing: "Close-up", source: "client_footage" }, { shot: "Oven", description: "Oven door opens", framing: "Medium", source: "new_shot" }, { shot: "Logo", description: "End card", framing: "Full frame", source: "graphic" }],
    voiceCaptions: { voice: "Warm, unhurried", captions: "Bold white, two lines", music: "Soft acoustic" },
  };
}


