"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/* Adaptateur shadcn (base-ui) aux jetons du site : le bloc dépliable. Un fichier par contrôle, pour qu'une page ne charge que le code
   des contrôles qu'elle affiche (un seul fichier réunissait avant Collapsible, Checkbox, Radio et Switch).
   Le CSS d'accompagnement est dans app/styles/controles.css. */


/* ===== Bloc dépliable =====
   Le contenu reste dans le HTML statique (hidden="until-found") : lisible par les moteurs et trouvable avec Ctrl+F. */
export function Depliable({
  titre,
  children,
  defaultOpen,
  open,
  onOpenChange,
  id,
  className,
  titreClassName,
  contenuClassName,
  chevron = true,
}: {
  titre: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  /* Classe du bloc (ex. « affiner », « precis ») : l'état ouvert est [data-open]. */
  className?: string;
  titreClassName?: string;
  contenuClassName?: string;
  chevron?: boolean;
}) {
  return (
    <Collapsible
      id={id}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange ? (o) => onOpenChange(o) : undefined}
      className={cn("depliable", className)}
    >
      <CollapsibleTrigger className={cn("depliable-titre", titreClassName)}>
        <span className="depliable-libelle">{titre}</span>
        {chevron ? <ChevronDown className="depliable-chevron" aria-hidden="true" /> : null}
      </CollapsibleTrigger>
      <CollapsibleContent hiddenUntilFound className={cn("depliable-contenu", contenuClassName)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
