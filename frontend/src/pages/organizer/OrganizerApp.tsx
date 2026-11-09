import { useQuery } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { api } from "@/services/api";
import { OrganizerLogin } from "./OrganizerLogin";
import { OrganizerLayout } from "./OrganizerLayout";
import { Overview } from "./Overview";
import { Filieres } from "./Filieres";
import { FiliereDetail } from "./FiliereDetail";
import { Candidates } from "./Candidates";
import { History } from "./History";
import { Notifications } from "./Notifications";

export function OrganizerApp() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-dashboard"],
    queryFn: api.dashboard,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) return <OrganizerLogin />;

  return (
    <OrganizerLayout>
      <Routes>
        <Route index element={<Overview initial={data!} />} />
        <Route path="filieres" element={<Filieres />} />
        <Route path="filieres/:code" element={<FiliereDetail />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="history" element={<History />} />
        <Route path="notifications" element={<Notifications />} />
      </Routes>
    </OrganizerLayout>
  );
}
