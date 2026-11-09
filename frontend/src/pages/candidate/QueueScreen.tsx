import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { subscribeToPush } from "@/services/schoolapp";
import { connectWebSocket } from "@/services/ws";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CandidateMe } from "@/types";

export function QueueScreen({ initial }: { initial: CandidateMe }) {
  const qc = useQueryClient();
  const candidateCsrf = useAuthStore((s) => s.candidateCsrf);
  const clearAuth = useAuthStore((s) => s.clear);

  const { data: me } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: api.me,
    initialData: initial,
  });

  const { data: config } = useQuery({
    queryKey: ["public-config"],
    queryFn: api.publicConfig,
  });

  const [pushState, setPushState] = useState<"unknown" | "granted" | "denied" | "unsupported">(
    "unknown"
  );
  const [subscribing, setSubscribing] = useState(false);

  // Live updates over WebSocket.
  useEffect(() => {
    const close = connectWebSocket("/api/v1/ws/candidate", (msg) => {
      if (msg.type === "queue_changed" || msg.type === "status_changed") {
        qc.invalidateQueries({ queryKey: ["candidate-me"] });
      }
    });
    return close;
  }, [qc]);

  // Determine push support/permission.
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "granted") setPushState("granted");
    else if (Notification.permission === "denied") setPushState("denied");
    else setPushState("unknown");
  }, []);

  async function enableNotifications() {
    if (!config?.vapid_public_key) {
      toast.error("Push is not configured.");
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        toast.error("Notification permission denied.");
        return;
      }
      const sub = await subscribeToPush(config.vapid_public_key);
      await api.addPushSubscription(
        {
          endpoint: sub.endpoint,
          p256dh: _b64(sub.getKey("p256dh")!),
          auth: _b64(sub.getKey("auth")!),
          expiration_time: sub.expirationTime ? new Date(sub.expirationTime).toISOString() : null,
        },
        candidateCsrf ?? ""
      );
      setPushState("granted");
      toast.success("Notifications enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable notifications.");
    } finally {
      setSubscribing(false);
    }
  }

  async function logout() {
    await api.logout();
    clearAuth();
    qc.invalidateQueries();
    window.location.reload();
  }

  const queue = me?.queue;
  const candidate = me?.candidate;
  const position = queue?.position;
  const status = queue?.status;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </div>
          <span className="font-semibold tracking-tight">{queue?.company_name ?? "FAME"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="animate-fade-in w-full max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            {candidate?.first_name} {candidate?.last_name}
          </p>
          {queue?.filiere_name && (
            <div className="mt-1">
              <Badge variant="secondary">{queue.filiere_name}</Badge>
            </div>
          )}

          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Your current position
            </p>
            {status === "WAITING" && position != null ? (
              <div className="mt-2 text-8xl font-semibold tracking-tight tabular-nums">
                {String(position).padStart(2, "0")}
              </div>
            ) : status === "ATTRIBUTED" ? (
              <div className="mt-2 text-5xl font-semibold tracking-tight text-emerald-600">
                Called
              </div>
            ) : (
              <div className="mt-2 text-5xl font-semibold tracking-tight text-muted-foreground">
                —</div>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{queue?.message}</p>

          <div className="mt-10 space-y-3">
            {status === "WAITING" && (
              <div className="flex items-center justify-center">
                {pushState === "granted" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BellRing className="h-4 w-4 text-emerald-600" />
                    Notifications on
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={enableNotifications}
                    disabled={subscribing || pushState === "unsupported" || pushState === "denied"}
                  >
                    <Bell className="h-4 w-4" />
                    {pushState === "denied"
                      ? "Notifications blocked in browser"
                      : "Enable notifications"}
                  </Button>
                )}
              </div>
            )}

            <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
              You are in a first-come, first-served queue for {queue?.company_name}. We will notify
              you as your turn approaches.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        {candidate?.ensam_code}
      </footer>
    </div>
  );
}

function _b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
