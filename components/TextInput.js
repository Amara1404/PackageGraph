export default function TextInput({ className = "", ...props }) {
  return (
    <input
      className={`text-sm border rounded-md px-3 py-1.5 bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] ${className}`}
      {...props}
    />
  );
}
