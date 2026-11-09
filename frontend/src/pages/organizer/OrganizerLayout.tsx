import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { History as HistoryIcon, LayoutDashboard, LogOut, Undo2, Users, Bell, Layers } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { connectWebSocket } from "@/services/ws";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/organizer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/organizer/filieres", label: "Filières", icon: Layers },
  { to: "/organizer/candidates", label: "Candidates", icon: Users },
  { to: "/organizer/history", label: "History", icon: HistoryIcon },
  { to: "/organizer/notifications", label: "Notifications", icon: Bell },
];

export function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const organizerCsrf = useAuthStore((s) => s.organizerCsrf);
  const clearAuth = useAuthStore((s) => s.clear);

  useEffect(() => {
    const close = connectWebSocket("/api/v1/ws/organizer", (msg) => {
      if (msg.type === "board_changed") {
        qc.invalidateQueries({ queryKey: ["organizer-dashboard"] });
        qc.invalidateQueries({ queryKey: ["organizer-queues"] });
        qc.invalidateQueries({ queryKey: ["organizer-filieres"] });
        qc.invalidateQueries({ queryKey: ["organizer-candidates"] });
        qc.invalidateQueries({ queryKey: ["organizer-history"] });
      }
    });
    return close;
  }, [qc]);

  async function undoLast() {
    try {
      const result = await api.undoLast(organizerCsrf ?? "");
      toast.success(`Undone: ${result.first_name} ${result.last_name}`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nothing to undo");
    }
  }

  async function logout() {
    await api.organizerLogout(organizerCsrf ?? "");
    clearAuth();
    navigate("/organizer");
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </div>
          <span className="font-semibold tracking-tight">FAME</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-accent text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={undoLast}>
            <Undo2 className="h-4 w-4" /> Undo last operation
          </Button>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
