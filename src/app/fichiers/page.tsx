import { AppHeader } from "@/components/app-header";
import { PageHeading } from "@/components/page-heading";
import { QuickFiles } from "@/components/quick-files";
import { listQuickFiles } from "@/db/repository";

export const dynamic = "force-dynamic";

export default function QuickFilesPage() {
  return (
    <main className="shell">
      <AppHeader />
      <div className="content">
        <PageHeading eyebrow="Pense-bêtes" title="Fichiers utiles" description="Idées, infos et documents à portée de main." />
        <QuickFiles files={listQuickFiles()} />
      </div>
      <footer>Vos données restent sur cet ordinateur.</footer>
    </main>
  );
}
