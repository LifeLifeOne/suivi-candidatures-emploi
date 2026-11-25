"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeApplicationStatusAction } from "@/app/actions";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type ApplicationStatus,
} from "@/lib/status";

type Props = {
  applicationId: number;
  currentStatus: ApplicationStatus;
};

export function StatusSelect({ applicationId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onChange(nextStatus: ApplicationStatus) {
    const previous = status;
    setStatus(nextStatus);
    setError("");
    startTransition(async () => {
      const result = await changeApplicationStatusAction(applicationId, nextStatus);
      if (!result.success) {
        setStatus(previous);
        setError(result.message ?? "Une erreur est survenue.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="status-control">
      <select
        aria-label="Changer le statut"
        className={`status-select ${STATUS_STYLES[status]}`}
        value={status}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as ApplicationStatus)}
      >
        {APPLICATION_STATUSES.map((value) => (
          <option key={value} value={value}>{STATUS_LABELS[value]}</option>
        ))}
      </select>
      {error ? <span className="inline-error" role="alert">{error}</span> : null}
    </div>
  );
}
