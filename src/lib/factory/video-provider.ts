// Provider-neutral video generation interface (piece C, CHG-0099). No video provider is wired in: Hook pack variants and Scene Pack
// motion loops are made in any video tool from the prompt pack the app writes, then uploaded by the producer (slot=piece). A future
// adapter implements VideoProvider, meters every call through the ledger (reserveApiCall / finishApiCall) like meteredImage, stores the
// bytes with putStudioFile and returns a StudioAssetRef tagged ai_generated. Client-safe: types and constants only.

export type VideoAspect = "9:16" | "4:5" | "1:1";
export type VideoReference = { bytes: Uint8Array; mime: string; name?: string; role: "first_frame" | "product" | "style" };
export type VideoRequest = {
  /** Shot-by-shot prompt from the prompt pack, built by code from approved pieces. */
  prompt: string;
  aspect: VideoAspect;
  seconds: number;
  references?: VideoReference[];
  /** Whether the tool should add sound; captions are always burned in after generation. */
  audio?: boolean;
};
export type VideoResult = { bytes: Uint8Array; mime: "video/mp4" | "video/quicktime"; usage: Record<string, number>; providerRequestId?: string };
export type VideoProvider = { provider: string; model: string; generateClip(request: VideoRequest): Promise<VideoResult> };

export const NO_VIDEO_TOOL = "No video tool connected; upload the clip";
/** The configured video provider. None is built yet, so this is always undefined and the page shows the upload state. */
export function configuredVideoProvider(): VideoProvider | undefined {
  return undefined;
}
