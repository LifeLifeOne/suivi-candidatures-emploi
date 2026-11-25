import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="page-heading">
      <Link href="/" className="back-link"><ArrowLeft size={17} /> Retour au tableau</Link>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
