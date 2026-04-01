export function SurfaceCard({ className = "", children }) {
  return <section className={`panel-surface ${className}`}>{children}</section>;
}

export function SectionEyebrow({ children }) {
  return <span className="section-eyebrow">{children}</span>;
}

export function StatusChip({ children, tone = "neutral" }) {
  const dotClass =
    tone === "success"
      ? "bg-[var(--accent-success)]"
      : tone === "danger"
        ? "bg-[var(--accent-danger)]"
        : tone === "warning"
          ? "bg-[var(--accent-warning)]"
          : "bg-[var(--accent-primary)]";

  return (
    <span className="status-chip">
      <span className={`status-dot ${dotClass}`} />
      {children}
    </span>
  );
}
