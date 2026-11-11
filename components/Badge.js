const TONES = {
  neutral: "bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)] border-[var(--color-border)]",
  success: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-transparent",
  danger: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-transparent",
  attention: "bg-[var(--color-attention-subtle)] text-[var(--color-attention)] border-transparent",
};

export default function Badge({ children, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TONES[tone] || TONES.neutral}`}
    >
      {children}
    </span>
  );
}
