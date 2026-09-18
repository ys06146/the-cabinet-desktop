interface LoadingSkeletonProps {
  label?: string;
  lines?: number;
}

const lineWidths = ['w-full', 'w-4/5', 'w-2/3', 'w-5/6'] as const;

export function LoadingSkeleton({
  label = 'Loading content',
  lines = 3,
}: LoadingSkeletonProps): React.JSX.Element {
  const safeLineCount = Math.max(1, Math.min(lines, 6));

  return (
    <div aria-busy="true" aria-label={label} className="space-y-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: safeLineCount }, (_, index) => (
        <span
          aria-hidden="true"
          className={`skeleton-shimmer block h-3 rounded-cabinet-sm ${lineWidths[index % lineWidths.length]}`}
          key={index}
        />
      ))}
    </div>
  );
}
