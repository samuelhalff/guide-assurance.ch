import { llmsTxt } from "@/lib/llms";

/* /llms.txt, écrit au build (export statique) depuis src/lib/llms.ts. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
