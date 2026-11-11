export default function Card({ title, className = "", children }) {
  return (
    <div className={`border border-[var(--color-border)] rounded-md bg-[var(--color-canvas)] ${className}`}>
      {title && (
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-canvas-subtle)] rounded-t-md text-sm font-medium text-[var(--color-fg)]">
          {title}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
