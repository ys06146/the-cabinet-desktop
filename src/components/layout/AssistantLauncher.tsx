import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

export function AssistantLauncher(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const closeAssistant = (): void => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        aria-controls="assistant-placeholder"
        aria-expanded={open}
        className="assistant-launcher fixed bottom-4 right-4 z-30 flex min-h-12 items-center gap-2 rounded-cabinet-lg border border-cabinet-brass bg-cabinet-accent px-4 text-sm font-bold text-cabinet-text shadow-cabinet-overlay hover:bg-cabinet-accent/80 sm:bottom-5 sm:right-5"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Icon className="size-5 text-cabinet-brass" name="assistant" />
        <span>Open Assistant</span>
      </button>

      <dialog
        aria-labelledby="assistant-title"
        className="assistant-dialog fixed bottom-20 right-4 m-0 w-[min(23rem,calc(100vw-2rem))] max-w-none rounded-cabinet-lg border border-cabinet-border bg-cabinet-elevated p-0 text-cabinet-text shadow-cabinet-overlay sm:bottom-24 sm:right-5"
        id="assistant-placeholder"
        onClose={closeAssistant}
        ref={dialogRef}
      >
        <div className="flex items-center justify-between border-b border-cabinet-border px-5 py-4">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Assistant
            </p>
            <h2 className="mt-1 font-serif text-xl" id="assistant-title">
              A quiet desk, not yet connected
            </h2>
          </div>
          <button
            aria-label="Close Assistant"
            autoFocus
            className="flex size-11 shrink-0 items-center justify-center rounded-cabinet-sm text-cabinet-muted hover:bg-cabinet-surface hover:text-cabinet-text"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="px-5 py-6 text-sm leading-7 text-cabinet-muted">
          Assistant interactions remain unavailable while The Cabinet uses mock-only providers. No
          prompt or message is sent outside this device.
        </p>
      </dialog>
    </>
  );
}
