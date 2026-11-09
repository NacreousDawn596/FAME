import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { QueueStatus } from "@/types";

function StatusBadge({ status }: { status: QueueStatus }) {
  if (status === "WAITING") return <Badge variant="secondary">Waiting</Badge>;
  if (status === "ATTRIBUTED") return <Badge variant="success">Attributed</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function Candidates() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const organizerCsrf = useAuthStore((s) => s.organizerCsrf);

  const { data, isLoading } = useQuery({
    queryKey: ["organizer-candidates", search],
    queryFn: () => api.candidates({ search: search || undefined }),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["organizer-candidates"] });
    qc.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    qc.invalidateQueries({ queryKey: ["organizer-queues"] });
    qc.invalidateQueries({ queryKey: ["organizer-history"] });
  }

  async function act(fn: () => Promise<unknown>, message: string) {
    try {
      await fn();
      toast.success(message);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">Search and attribute candidates.</p>
        </div>
        <Input
          placeholder="Search name, ENSAM code, filière…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ENSAM code</th>
                <th className="px-4 py-3 font-medium">Filière</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items.map((c) => (
                <tr key={c.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.ensam_code}</td>
                  <td className="px-4 py-3 text-xs">{c.filiere_code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.year ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.position ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {c.status === "WAITING" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            act(
                              () => api.manualAttribute(c.id, organizerCsrf ?? ""),
                              `Attributed ${c.first_name} ${c.last_name}`
                            )
                          }
                        >
                          Attribute
                        </Button>
                      )}
                      {c.status === "ATTRIBUTED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              act(
                                () => api.undoAttribution(c.id, organizerCsrf ?? ""),
                                "Attribution undone"
                              )
                            }
                          >
                            Undo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              act(
                                () => api.returnToQueue(c.id, organizerCsrf ?? ""),
                                "Returned to queue"
                              )
                            }
                          >
                            Return
                          </Button>
                        </>
                      )}
                      {c.status === "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            act(
                              () => api.restoreCandidate(c.id, organizerCsrf ?? ""),
                              "Candidate restored"
                            )
                          }
                        >
                          Restore
                        </Button>
                      )}
                      {c.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            act(
                              () => api.cancelCandidate(c.id, organizerCsrf ?? ""),
                              "Candidate cancelled"
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.items.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No candidates found.</p>
          )}
        </div>
      )}
    </div>
  );
}
