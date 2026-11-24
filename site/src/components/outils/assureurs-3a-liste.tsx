"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Depliable } from "@/components/controle-depliable";
import { Card, CardContent } from "@/components/ui/card";

/* Liste des assureurs 3a : un bloc dépliable par assureur, plusieurs ouverts à la fois. Le contenu reste dans le HTML statique
   (hidden="until-found"). Un lien #assureur ouvre le bloc visé, comme le faisait <details id>. */
export type BlocAssureur = { id: string; titre: ReactNode; nombre: ReactNode; contenu: ReactNode };

export function Assureurs3aListe({ blocs }: { blocs: BlocAssureur[] }) {
  const [ouverts, setOuverts] = useState<string[]>([]);

  useEffect(() => {
    const suivreHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !blocs.some((b) => b.id === id)) return;
      setOuverts((cur) => (cur.includes(id) ? cur : [...cur, id]));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    };
    suivreHash();
    window.addEventListener("hashchange", suivreHash);
    return () => window.removeEventListener("hashchange", suivreHash);
  }, [blocs]);

  return (
    <div className="assureurs-3a">
      {blocs.map((b) => (
        <Card key={b.id} size="sm">
        <CardContent>
        <Depliable
          id={b.id}
          className="assureur-3a"
          open={ouverts.includes(b.id)}
          onOpenChange={(o) => setOuverts((cur) => (o ? [...cur, b.id] : cur.filter((x) => x !== b.id)))}
          titre={
            <>
              <b>{b.titre}</b>
              <span className="assureur-nombre">{b.nombre}</span>
            </>
          }
        >
          {b.contenu}
        </Depliable>
        </CardContent>
        </Card>
      ))}
    </div>
  );
}
