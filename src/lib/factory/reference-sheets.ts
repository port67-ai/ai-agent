import type { Database, VideoImageKind } from "./model";
export const SHEET_SKILL_VERSION="1.0.0";
export const PREFERRED_SHEET_MODEL="gpt-image-2";
export const SHEET_STYLES={
 Character:{category:"Person",layout:"Matched-scale full body front, side and back, head-and-shoulders close-up; details of skin, hair, clothing construction, seams, footwear and accessories; sampled palette."},
 Animal:{category:"Prop",layout:"Matched-scale front, side, rear, facial close-up, coat, feathers, scales, paws, markings and palette; preserve anatomy, do not anthropomorphise."},
 Environment:{category:"Location",layout:"Wide establishing view, complementary viewpoints, spatial layout, architectural and material close-ups, palette and lighting continuity."},
 Product:{category:"Product",layout:"Matched-scale front, side, rear, three-quarter, top or cap/base where useful; packaging, label, closure, material and palette. Preserve branding; no invented claims."},
 Vehicle:{category:"Prop",layout:"Front, side, rear and three-quarter orthographic-like views; wheels, lights, grille, trim and material details. Preserve geometry and wheelbase."},
 Prop:{category:"Prop",layout:"Overall view, complementary angles, material, construction and identifying details; omit irrelevant views."},
 Plant:{category:"Prop",layout:"Whole plant silhouette, complementary angles, leaves, bark, stems and visible natural structures. Preserve season and growth habit."},
 Lighting:{category:"Scene",layout:"Consistent subject and scene with clearly labelled lighting direction, source, shadow, exposure and palette details; no invented physical specifications."},
 Storyboard:{category:"Scene",layout:"Clean numbered sequential shot panels showing the same subject and setting with consistent screen direction and framing. No unsupported narrative events."}
} as const satisfies Record<string,{category:VideoImageKind;layout:string}>;
export type SheetKind=keyof typeof SHEET_STYLES;
export type SheetDraft={id:string;commissionId:string;type:"source"|"output";name:string;mime:"image/png"|"image/jpeg"|"image/webp";bytes:number;storageKey:string;createdBy:string;createdAt:string;kind?:SheetKind;model?:string;sourceIds?:string[];approved?:boolean};
export function sheetKind(v:unknown):SheetKind{if(typeof v!=="string"||!Object.hasOwn(SHEET_STYLES,v))throw Error("Choose a sheet category");return v as SheetKind;}
export const draftsOf=(db:Database,pid:string,actor:string)=>(db.referenceSheetDrafts||[]).filter(x=>x.commissionId===pid&&x.createdBy===actor);
export function sheetPrompt(kind:SheetKind,notes:string,style:string){return `Create one production-quality photorealistic landscape reference board. Use the supplied subject images as source of truth; review all angles and preserve identity, proportions, geometry, colour, texture, markings, visible clothing and accessories. Do not beautify, redesign or invent details. Reconstruct unseen angles conservatively; omit uncertain details. Clean light neutral studio background, even light, restrained uppercase charcoal labels, clear panel separation, no watermark, clutter or unrelated subjects. Compose all essential information safely within the central 16:9 area. Category layout: ${SHEET_STYLES[kind].layout} Check that all panels depict the same subject. Project style guidance (subordinate to faithful reference and clean board): ${style.slice(0,900)}. Producer notes (do not override fidelity): ${notes.slice(0,900)}.`;}
export const publicDraft=(d:SheetDraft)=>{const {storageKey:_,...rest}=d;void _;return rest;};
