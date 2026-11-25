import Link from "next/link";
import { BriefcaseBusiness, Plus, StickyNote } from "lucide-react";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="Accueil du suivi de candidatures">
        <span className="brand-mark"><BriefcaseBusiness size={21} strokeWidth={2.2} /></span>
        <span>
          <strong>Candidatures</strong>
          <small>Mon suivi d’emploi</small>
        </span>
      </Link>
      <nav className="header-actions">
        <Link href="/fichiers" className="button">
          <StickyNote size={18} />
          <span>Pense-bêtes</span>
        </Link>
        <Link href="/candidatures/nouvelle" className="button button-primary">
          <Plus size={18} />
          <span>Ajouter</span>
        </Link>
      </nav>
    </header>
  );
}
