import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ServerCrash } from "lucide-react";
import { API_BASE_URL } from "../api/config";

const STATUS_META = {
  loading: {
    label: "Verifying command network",
    detail: "Checking API reachability before you enter the workspace.",
    icon: LoaderCircle,
    className: "border-[color:var(--border-soft)] bg-[rgba(255,255,255,0.68)] text-[var(--text-muted)]",
    iconClassName: "animate-spin text-[var(--accent-primary)]",
  },
  success: {
    label: "Backend is working",
    detail: "Realtime command services are reachable from the deployed frontend.",
    icon: CheckCircle2,
    className: "border-[rgba(15,145,114,0.18)] bg-[rgba(15,145,114,0.08)] text-[var(--text-primary)]",
    iconClassName: "text-[var(--accent-success)]",
  },
  error: {
    label: "Backend connection issue",
    detail: "The UI loaded, but API requests are not completing successfully.",
    icon: ServerCrash,
    className: "border-[rgba(190,76,76,0.18)] bg-[rgba(190,76,76,0.08)] text-[var(--text-primary)]",
    iconClassName: "text-[var(--accent-danger)]",
  },
};

export default function BackendStatusBanner() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(STATUS_META.loading.label);

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch(`${API_BASE_URL}/test`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Backend check failed");
        }
        setStatus("success");
        setMessage(payload.message || STATUS_META.success.label);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setStatus("error");
        setMessage(STATUS_META.error.label);
      }
    }

    checkBackend();
    return () => controller.abort();
  }, []);

  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className="sticky top-0 z-40 px-4 pt-4 md:px-6">
      <div className={`mx-auto flex max-w-[1480px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur ${meta.className}`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.72)]">
          <Icon className={`h-5 w-5 ${meta.iconClassName}`} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[0.01em]">{message}</p>
          <p className="text-xs text-[var(--text-dim)]">{meta.detail}</p>
        </div>
      </div>
    </div>
  );
}
