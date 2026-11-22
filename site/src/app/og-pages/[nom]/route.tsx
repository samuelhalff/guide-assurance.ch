import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ligneMaj, pagesPartage, partageParCle } from "@/lib/og";

/* Image de partage 1200 × 630 de chaque page (out/og-pages/<clé>.png), écrite au build. Même habillage que
   l'ancienne image générale : fond encre, bouquetin clair, nom en Archivo large, filet rouge en bas. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return pagesPartage().map((p) => ({ nom: `${p.cle}.png` }));
}

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f));
const police = (f: string) => lire(`src/og/${f}.ttf`);
const LOGO = `data:image/svg+xml;base64,${lire("public/brand/logo-silhouette-clair.svg").toString("base64")}`;

export async function GET(_: Request, { params }: { params: Promise<{ nom: string }> }) {
  const { nom } = await params;
  const p = partageParCle(nom.replace(/\.png$/, ""));
  if (!p) return new Response("introuvable", { status: 404 });
  const taille = p.titre.length > 64 ? 56 : p.titre.length > 44 ? 64 : 72;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#1A1C19", color: "#E9ECE5", fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 80px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} width={88} height={88} alt="" />
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "ArchivoLarge", fontSize: 28, letterSpacing: 1.5, lineHeight: 1 }}>
              <span style={{ fontWeight: 500, color: "#E5484D" }}>GUIDE</span>
              <span style={{ fontWeight: 800, marginTop: 6 }}>ASSURANCE</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontSize: 30, fontWeight: 500, color: "#D9953C" }}>{p.rubrique}</span>
            <span style={{ fontSize: taille, fontWeight: 800, lineHeight: 1.06, letterSpacing: -0.5, maxWidth: 1020 }}>{p.titre}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 500, color: "#B9C0B4" }}>
            <span>guide-assurance.ch</span>
            <span>{ligneMaj(p)}</span>
          </div>
        </div>
        <div style={{ height: 12, background: "#C8202F" }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Archivo", data: police("archivo-500"), weight: 500, style: "normal" },
        { name: "Archivo", data: police("archivo-800"), weight: 800, style: "normal" },
        { name: "ArchivoLarge", data: police("archivo-large-500"), weight: 500, style: "normal" },
        { name: "ArchivoLarge", data: police("archivo-large-800"), weight: 800, style: "normal" },
      ],
    },
  );
}
