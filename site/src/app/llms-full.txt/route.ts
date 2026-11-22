import { llmsFullTxt } from "@/lib/llms";

/* /llms-full.txt : texte intégral des guides FR et EN, écrit au build depuis src/lib/llms.ts. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
