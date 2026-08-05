import { vehicleStatusLabels, vehicleStatusStyles } from "@/lib/format";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${vehicleStatusStyles[status] ?? ""}`}
    >
      {vehicleStatusLabels[status] ?? status}
    </span>
  );
}
