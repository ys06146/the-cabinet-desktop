interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

export function ErrorMessage({
  message,
  onRetry,
  retryLabel = 'Try again',
  title = 'Something went wrong',
}: ErrorMessageProps): React.JSX.Element {
  return (
    <section
      className="border-y border-cabinet-border border-l-2 border-l-cabinet-negative bg-cabinet-surface px-5 py-5"
      role="alert"
    >
      <p className="font-serif text-xl text-cabinet-text">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-cabinet-muted">{message}</p>
      {onRetry ? (
        <button
          className="mt-4 min-h-10 rounded-cabinet-sm border border-cabinet-border bg-cabinet-elevated px-4 text-sm font-semibold text-cabinet-text hover:border-cabinet-brass"
          onClick={onRetry}
          type="button"
        >
          {retryLabel}
        </button>
      ) : null}
    </section>
  );
}
