export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[var(--color-border)]">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-fg)]">{title}</h1>
        {description && <p className="text-sm text-[var(--color-fg-muted)] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
