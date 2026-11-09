import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Filieres() {
  const { data, isLoading } = useQuery({
    queryKey: ["organizer-queues"],
    queryFn: api.queues,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Filières</h1>
        <p className="text-sm text-muted-foreground">Attribute candidates per filière.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((f) => (
          <Link key={f.code} to={`/organizer/filieres/${f.code}`}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="font-mono text-xs text-muted-foreground">{f.code}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{f.intitule}</p>
                <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                  <span>Waiting <b className="text-foreground">{f.waiting}</b></span>
                  <span>Attributed <b className="text-foreground">{f.attributed}</b></span>
                  <span>Cancelled <b className="text-foreground">{f.cancelled}</b></span>
                </div>
                {f.first_waiting && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Next: <span className="text-foreground">{f.first_waiting}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
