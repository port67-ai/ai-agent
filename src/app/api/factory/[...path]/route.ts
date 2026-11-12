import { handleFactory } from "@/lib/factory/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleFactory(request, path);
}
export { handler as GET, handler as POST };
