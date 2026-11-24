"use client";
import { CONSENTEMENT_REQUIS } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/* Lien « Cookies » du pied de page pour revoir son choix. */
export function RouvrirMesure() {
  if (!CONSENTEMENT_REQUIS) return null;
  return (
    <Button type="button" variant="pied" size="herite" onClick={() => window.dispatchEvent(new Event("mesure:rouvrir"))}>
      Cookies
    </Button>
  );
}
