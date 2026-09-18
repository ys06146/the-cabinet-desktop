interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  action?: EmptyStateAction;
  description: string;
  eyebrow?: string;
  title: string;
}

export function EmptyState({
  action,
  description,
  eyebrow = 'The Cabinet',
  title,
}: EmptyStateProps): React.JSX.Element {
  return (
    <section className="mx-auto w-full max-w-2xl border-y border-cabinet-border px-4 py-12 text-center sm:px-8 sm:py-16">
      <span aria-hidden="true" className="mx-auto block h-px w-12 bg-cabinet-brass" />
      <p className="mt-5 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-cabinet-brass">
        {eyebrow}
      </p>
      <h2 className="mt-3 break-words font-serif text-3xl text-cabinet-text sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-cabinet-muted sm:text-base">
        {description}
      </p>
      {action ? (
        <button
          className="mt-7 min-h-11 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-5 text-sm font-semibold text-cabinet-text hover:bg-cabinet-accent/80"
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      ) : null}
    </section>
  );
}
