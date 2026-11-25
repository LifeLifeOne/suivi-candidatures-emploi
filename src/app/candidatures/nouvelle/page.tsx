import { AppHeader } from "@/components/app-header";
import { ApplicationForm } from "@/components/application-form";
import { PageHeading } from "@/components/page-heading";
import { listTags } from "@/db/repository";

export const dynamic = "force-dynamic";

export default function NewApplicationPage() {
  const today = new Date().toISOString().slice(0, 10);
  const availableTags = listTags();
  return (
    <main className="shell">
      <AppHeader />
      <div className="content narrow-content">
        <PageHeading
          eyebrow="Nouvelle candidature"
          title="Ajouter une opportunité"
          description="Les champs marqués d’un astérisque sont obligatoires."
        />
        <section className="panel form-panel">
          <ApplicationForm defaultDate={today} availableTags={availableTags} />
        </section>
      </div>
    </main>
  );
}
