import { listApplications } from "@/db/repository";
import { applicationsToCsv } from "@/lib/csv";
import type { ApplicationView } from "@/lib/application-view";

export const dynamic = "force-dynamic";

export function GET() {
  const csv = applicationsToCsv(listApplications() as ApplicationView[]);
  const filename = `candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
