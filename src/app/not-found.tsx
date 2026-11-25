import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found">
      <SearchX size={42} />
      <h1>Candidature introuvable</h1>
      <p>Elle a peut-être été supprimée ou le lien est incorrect.</p>
      <Link href="/" className="button button-primary"><ArrowLeft size={17} /> Retour au tableau</Link>
    </main>
  );
}
