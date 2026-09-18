import type { RoomDefinition } from '../../domain/workspace';

interface RoomPlaceholderProps {
  room: RoomDefinition;
  folio: string;
}

export function RoomPlaceholder({ room, folio }: RoomPlaceholderProps): React.JSX.Element {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-[1320px] flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cabinet-border pb-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-cabinet-brass">
          {room.issueLabel}
        </p>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cabinet-muted">
          Folio {folio}
        </p>
      </div>

      <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:py-16">
        <div className="max-w-3xl">
          <p className="font-serif text-lg italic text-cabinet-brass sm:text-xl">
            The room is prepared.
          </p>
          <h2 className="mt-4 break-words font-serif text-4xl leading-[0.98] tracking-[-0.025em] text-cabinet-text sm:text-5xl lg:text-6xl">
            {room.title}
          </h2>
          <p className="mt-6 max-w-2xl border-l-2 border-cabinet-accent pl-4 text-sm leading-7 text-cabinet-muted sm:pl-5 sm:text-base sm:leading-8">
            {room.description}
          </p>
          <p className="mt-8 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-cabinet-muted">
            Detailed instruments remain outside this stage.
          </p>
        </div>

        <div className="border-y border-cabinet-border">
          {room.previewItems.map((item, index) => (
            <div
              className="flex min-h-14 items-center justify-between gap-4 border-b border-cabinet-border px-1 last:border-b-0"
              key={item}
            >
              <span className="text-sm font-semibold tracking-wide text-cabinet-text">{item}</span>
              <span className="font-mono text-[0.68rem] text-cabinet-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-cabinet-border pt-4 text-[0.62rem] uppercase tracking-[0.18em] text-cabinet-muted">
        <span>Local workspace</span>
        <span aria-hidden="true" className="hidden h-px min-w-8 flex-1 bg-cabinet-border sm:block" />
        <span>No external services connected</span>
      </footer>
    </section>
  );
}