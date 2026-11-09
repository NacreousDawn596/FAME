import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

function opLabel(op: string): string {
  const map: Record<string, string> = {
    FIFO: "FIFO attribution",
    MANUAL: "Manual attribution",
    UNDO: "Undo",
    RETURN: "Return to queue",
    CANCEL: "Cancel",
    RESTORE: "Restore",
  };
  return map[op] ?? op;
}

export function History() {
  const { data, isLoading } = useQuery({
    queryKey: ["organizer-history"],
    queryFn: () => api.history(1),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Attribution history</h1>
        <p className="text-sm text-muted-foreground">Immutable audit log of all operations.</p>
      </header>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Operation</th>
              <th className="px-4 py-3 font-medium">From → To</th>
              <th className="px-4 py-3 font-medium">Organizer</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items.map((op) => (
              <tr key={op.id} className="hover:bg-accent/30">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(op.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{op.ensam_code}</td>
                <td className="px-4 py-3">{opLabel(op.operation_type)}</td>
                <td className="px-4 py-3 text-xs">
                  {op.previous_state ?? "—"} → {op.new_state ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{op.organizer_username ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.items.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No operations recorded.</p>
        )}
      </div>
    </div>
  );
}
