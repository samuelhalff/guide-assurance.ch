/* Classes du déclencheur et de la valeur du Select shadcn, dans un fichier sans Base UI : le déclencheur léger de
   outils/choix.tsx (rendu avant l'arrivée du code de Base UI) et ui/select.tsx les lisent ici, une seule source. */
export const selectTriggerClasses =
  "ph-sensitive flex w-fit min-w-0 max-w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-champ py-2 pr-3 pl-3 text-[17px] text-foreground whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-12 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)]  dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
export const selectValueClasses = "block min-w-0 flex-1 truncate text-left";
export const selectIconClasses = "pointer-events-none size-4 text-muted-foreground";
