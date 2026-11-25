"use client";

import { Trash2 } from "lucide-react";
import { deleteApplicationAction } from "@/app/actions";

export function DeleteButton({ applicationId }: { applicationId: number }) {
  const action = deleteApplicationAction.bind(null, applicationId);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Supprimer définitivement cette candidature et son historique ?")) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="button button-danger"><Trash2 size={17} /> Supprimer</button>
    </form>
  );
}
