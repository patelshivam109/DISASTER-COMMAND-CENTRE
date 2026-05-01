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
    <div className="sticky top-0 z-40 px-2 pt-2 sm:px-3 md:px-5">
      <div
        className={`mx-auto flex max-w-[1440px] items-center gap-2.5 rounded-xl border px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur ${meta.className}`}
        role="status"
        aria-live="polite"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.72)]" aria-hidden="true">
          <Icon className={`h-5 w-5 ${meta.iconClassName}`} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.01em] sm:text-sm">{message}</p>
          <p className="hidden text-xs text-[var(--text-dim)] sm:block">{meta.detail}</p>
        </div>
      </div>
    </div>
  );
}
