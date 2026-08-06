"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reassignClient, type ReassignClientState } from "@/lib/actions/agencies";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-ink-50 disabled:opacity-60"
    >
      {pending ? "..." : "Attribuer"}
    </button>
  );
}

export default function AssignClientRow({
  agencyId,
  clientId,
  clientName,
  staffOptions,
}: {
  agencyId: string;
  clientId: string;
  clientName: string;
  staffOptions: { id: string; email: string }[];
}) {
  const reassignWithAgency = reassignClient.bind(null, agencyId);
  const [state, formAction] = useActionState<ReassignClientState, FormData>(
    reassignWithAgency,
    {},
  );

  return (
    <div className="py-3">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
          {clientName}
        </span>
        <select
          name="assignedStaffId"
          required
          defaultValue=""
          className="rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="" disabled>
            Attribuer à...
          </option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.email}
            </option>
          ))}
        </select>
        <SubmitButton />
      </form>
      {state.error && <p className="mt-1 text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
