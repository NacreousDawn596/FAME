import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FiliereDetail() {
  const { code = "_unspecified" } = useParams();
  const qc = useQueryClient();
  const organizerCsrf = useAuthStore((s) => s.organizerCsrf);

  const { data, isLoading } = useQuery({
    queryKey: ["organizer-queue-detail", code],
    queryFn: () => api.queueDetail(code),
  });

  async function attributeNext() {
    try {
      const result = await api.fifoAttribute(code === "_unspecified" ? null : code, organizerCsrf ?? "");
      toast.success(`Attributed ${result.first_name} ${result.last_name} (${result.ensam_code})`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No candidate to attribute");
    }
  }

  async function attributeCandidate(id: number, name: string) {
    try {
      await api.manualAttribute(id, organizerCsrf ?? "");
      toast.success(`Attributed ${name}`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Attribution failed");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <Link to="/organizer/filieres" className="text-sm text-muted-foreground hover:underline">
            ← Filières
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            <span className="font-mono text-lg text-muted-foreground">{code}</span>
            <span className="ml-3">{data?.intitule}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/organizer/candidates">
              <Search className="h-4 w-4" /> Search candidates
            </Link>
          </Button>
          <Button onClick={attributeNext} disabled={(data?.waiting.length ?? 0) === 0}>
            Attribute next candidate <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Waiting queue{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({data?.total_waiting ?? 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">No waiting candidates.</p>
          ) : (
            <ul className="divide-y">
              {data?.waiting.map((c) => (
                <li key={c.candidate_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold tabular-nums">
                      {c.position}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.ensam_code}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => attributeCandidate(c.candidate_id, `${c.first_name} ${c.last_name}`)}
                  >
                    Attribute
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Undo2 className="h-3 w-3" />
        You can undo any attribution from the sidebar or the Candidates page.
      </div>
    </div>
  );
}
