const VARIANTS = {
  default:
    "bg-[var(--color-btn-bg)] border-[var(--color-btn-border)] text-[var(--color-fg)] hover:bg-[var(--color-btn-hover-bg)]",
  primary:
    "bg-[var(--color-btn-primary-bg)] border-transparent text-[var(--color-btn-primary-fg)] hover:bg-[var(--color-btn-primary-hover-bg)]",
  danger:
    "bg-[var(--color-btn-bg)] border-[var(--color-btn-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)]",
};

export default function Button({ variant = "default", className = "", ...props }) {
  return (
    <button
      className={`text-sm font-medium border rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
