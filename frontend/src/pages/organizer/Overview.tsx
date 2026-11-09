import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardResponse } from "@/types";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

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

export function Overview({ initial }: { initial: DashboardResponse }) {
  const { data } = useQuery({
    queryKey: ["organizer-dashboard"],
    queryFn: api.dashboard,
    initialData: initial,
    refetchInterval: 15_000,
  });

  const { stats, waiting_by_filiere, recent_operations, notification_stats } = data!;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Live recruitment queue status.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Registered" value={stats.total_candidates} />
        <Stat label="Waiting" value={stats.waiting} />
        <Stat label="Attributed" value={stats.attributed} />
        <Stat label="Cancelled" value={stats.cancelled} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waiting by filière</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {waiting_by_filiere.length === 0 && (
              <p className="text-sm text-muted-foreground">No waiting candidates.</p>
            )}
            {waiting_by_filiere.map((f) => (
              <Link
                key={f.code}
                to={`/organizer/filieres/${f.code}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="truncate">
                  <span className="font-mono text-xs text-muted-foreground">{f.code}</span>{" "}
                  <span className="ml-2">{f.intitule}</span>
                </span>
                <Badge variant="secondary">{f.waiting}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent_operations.length === 0 && (
              <p className="text-sm text-muted-foreground">No operations yet.</p>
            )}
            {recent_operations.slice(0, 10).map((op) => (
              <div key={op.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  <span className="font-medium">{op.ensam_code}</span>{" "}
                  <span className="text-muted-foreground">{opLabel(op.operation_type)}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(op.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Sent</p>
            <p className="text-2xl font-semibold tabular-nums">{notification_stats.sent}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold tabular-nums">{notification_stats.pending}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Failed</p>
            <p className="text-2xl font-semibold tabular-nums">{notification_stats.failed}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
