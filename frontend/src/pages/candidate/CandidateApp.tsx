import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { CandidateLogin } from "./CandidateLogin";
import { QueueScreen } from "./QueueScreen";

export function CandidateApp() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: api.me,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <div className="animate-fade-in">Loading…</div>
      </div>
    );
  }

  const isAuthed = !!(data && !error);
  if (!isAuthed) return <CandidateLogin />;
  return <QueueScreen initial={data!} />;
}
