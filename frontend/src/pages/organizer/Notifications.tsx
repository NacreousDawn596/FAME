import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "success" | "destructive" | "secondary" | "outline" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export function Notifications() {
  const { data, isLoading } = useQuery({
    queryKey: ["organizer-notifications"],
    queryFn: () => api.notifications(1),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Delivery status of push notifications.</p>
      </header>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items.map((n) => (
              <tr key={n.id} className="hover:bg-accent/30">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{n.ensam_code}</td>
                <td className="px-4 py-3">{n.event_type}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(n.status)}>{n.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.items.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No notifications sent yet.</p>
        )}
      </div>
    </div>
  );
}
