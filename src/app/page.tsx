import { AppHeader } from "@/components/app-header";
import { Dashboard } from "@/components/dashboard";
import { listApplications, listFollowUps } from "@/db/repository";
import type { ApplicationView } from "@/lib/application-view";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const applications = listApplications() as ApplicationView[];

  return (
    <main className="shell">
      <AppHeader />
      <div className="content"><Dashboard applications={applications} followUps={listFollowUps()} /></div>
      <footer>Vos données restent sur cet ordinateur.</footer>
    </main>
  );
}
