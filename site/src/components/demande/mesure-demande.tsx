"use client";
import { useEffect } from "react";
import { demarrerMesureDemande } from "@/lib/analytics";

/* Placé avant le formulaire dans la mise en page : son effet part en premier, avant demande_ouverte. */
export function MesureDemande() {
  useEffect(() => demarrerMesureDemande(), []);
  return null;
}
