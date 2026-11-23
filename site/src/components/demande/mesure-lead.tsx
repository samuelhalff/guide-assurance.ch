"use client";
import { useEffect } from "react";
import { PORTES } from "@shared/demande/portes";
import { mesurerLead } from "@/lib/analytics";

/* Page de remerciement : conversion GA4 generate_lead { porte } si le formulaire vient d'envoyer une demande (lib/analytics.ts). */
export function MesureLead() {
  useEffect(() => mesurerLead(PORTES), []);
  return null;
}
