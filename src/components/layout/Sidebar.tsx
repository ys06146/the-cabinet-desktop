import { useEffect, useRef } from 'react';
import {
  WORKSPACE_NAVIGATION_ITEMS,
  type WorkspaceNavigationGroup,
  type WorkspaceSectionId,
} from '../../domain/workspace';
import { useRuntimeInfo } from '../../hooks/use-runtime-info';
import { Icon, type IconName } from '../ui/Icon';

const navigationIcons: Record<WorkspaceSectionId, IconName> = {
  'market-room': 'market',
  'game-atelier': 'game',
  'saved-items': 'bookmark',
  notes: 'note',
  settings: 'settings',
};

const navigationGroups: readonly {
  id: WorkspaceNavigationGroup;
  label: string;
}[] = [
  { id: 'rooms', label: 'Rooms' },
  { id: 'library', label: 'Library' },
] as const;

interface SidebarProps {
  activeSectionId: WorkspaceSectionId;
  collapsed?: boolean;
  id: string;
  mobile?: boolean;
  onNavigate: (sectionId: WorkspaceSectionId) => void;
  onRequestClose?: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({
  activeSectionId,
  collapsed = false,
  id,
  mobile = false,
  onNavigate,
  onRequestClose,
  onToggleCollapsed,
}: SidebarProps): React.JSX.Element {
  const { runtimeInfo, status: runtimeInfoStatus } = useRuntimeInfo();
  const settingsItem = WORKSPACE_NAVIGATION_ITEMS.find((item) => item.id === 'settings');

  return (
    <aside
      aria-label="The Cabinet navigation"
      className="flex h-full flex-col border-r border-cabinet-border bg-cabinet-surface"
      id={id}
    >
      <div
        className={`flex min-h-20 items-center border-b border-cabinet-border px-3 ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}
      >
        <div className={`flex min-w-0 items-center ${collapsed ? '' : 'gap-3'}`}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-cabinet-sm border border-cabinet-brass/70 font-serif text-sm font-bold tracking-wider text-cabinet-brass">
            TC
          </span>
          <div className={collapsed ? 'sr-only' : 'min-w-0'}>
            <p className="truncate font-serif text-lg tracking-wide text-cabinet-text">The Cabinet</p>
            <p className="truncate text-[0.6rem] uppercase tracking-[0.2em] text-cabinet-muted">
              Private workspace
            </p>
          </div>
        </div>

        {mobile ? (
          <button
            aria-label="Close navigation"
            autoFocus
            className="flex size-11 shrink-0 items-center justify-center rounded-cabinet-sm text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text"
            onClick={onRequestClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Workspace sections" className="flex-1 overflow-y-auto px-3 py-5">
        {navigationGroups.map((group) => (
          <div className="mb-6" key={group.id}>
            <p
              className={
                collapsed
                  ? 'sr-only'
                  : 'mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-cabinet-muted'
              }
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {WORKSPACE_NAVIGATION_ITEMS.filter((item) => item.group === group.id).map((item) => {
                const isActive = item.id === activeSectionId;
                return (
                  <button
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={`relative flex min-h-11 w-full items-center rounded-cabinet-sm border text-sm font-semibold transition-colors ${
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left'
                    } ${
                      isActive
                        ? 'border-cabinet-border bg-cabinet-elevated text-cabinet-text before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-cabinet-accent'
                        : 'border-transparent text-cabinet-muted hover:border-cabinet-border hover:bg-cabinet-elevated/60 hover:text-cabinet-text'
                    }`}
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    type="button"
                  >
                    <Icon className="size-[1.15rem] shrink-0" name={navigationIcons[item.id]} />
                    <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-cabinet-border p-3">
        {settingsItem ? (
          <button
            aria-current={activeSectionId === settingsItem.id ? 'page' : undefined}
            aria-label={collapsed ? settingsItem.label : undefined}
            className={`relative flex min-h-11 w-full items-center rounded-cabinet-sm border text-sm font-semibold transition-colors ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left'
            } ${
              activeSectionId === settingsItem.id
                ? 'border-cabinet-border bg-cabinet-elevated text-cabinet-text before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-cabinet-accent'
                : 'border-transparent text-cabinet-muted hover:border-cabinet-border hover:bg-cabinet-elevated/60 hover:text-cabinet-text'
            }`}
            onClick={() => onNavigate(settingsItem.id)}
            title={collapsed ? settingsItem.label : undefined}
            type="button"
          >
            <Icon className="size-[1.15rem] shrink-0" name="settings" />
            <span className={collapsed ? 'sr-only' : 'truncate'}>{settingsItem.label}</span>
          </button>
        ) : null}

        <div
          aria-label={
            runtimeInfoStatus === 'ready' && runtimeInfo
              ? `The Cabinet version ${runtimeInfo.version}`
              : runtimeInfoStatus === 'error'
                ? 'App version unavailable'
                : 'App version loading'
          }
          className={`mt-3 border-t border-cabinet-border pt-3 font-mono text-[0.68rem] text-cabinet-muted ${collapsed ? 'text-center' : 'flex items-center justify-between px-3'}`}
        >
          <span className={collapsed ? 'sr-only' : ''}>Version</span>
          <span>
            {runtimeInfoStatus === 'ready' && runtimeInfo
              ? `v${runtimeInfo.version}`
              : runtimeInfoStatus === 'error'
                ? 'N/A'
                : 'v—'}
          </span>
        </div>

        {!mobile && onToggleCollapsed ? (
          <button
            aria-controls={id}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-keyshortcuts="Control+B Meta+B"
            className={`mt-3 flex min-h-11 w-full items-center rounded-cabinet-sm border border-transparent text-xs font-semibold text-cabinet-muted hover:border-cabinet-border hover:bg-cabinet-elevated hover:text-cabinet-text ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            type="button"
          >
            <Icon className={`size-[1.15rem] ${collapsed ? 'rotate-180' : ''}`} name="collapse" />
            <span className={collapsed ? 'sr-only' : ''}>Collapse sidebar</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

interface MobileSidebarDialogProps {
  activeSectionId: WorkspaceSectionId;
  onDismiss: (restoreFocus?: boolean) => void;
  onNavigate: (sectionId: WorkspaceSectionId) => void;
  open: boolean;
}

export function MobileSidebarDialog({
  activeSectionId,
  onDismiss,
  onNavigate,
  open,
}: MobileSidebarDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const suppressFocusRestore = useRef(false);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleBreakpoint = (event: MediaQueryListEvent): void => {
      if (event.matches) {
        suppressFocusRestore.current = true;
        onDismiss(false);
      }
    };
    mediaQuery.addEventListener('change', handleBreakpoint);
    return () => mediaQuery.removeEventListener('change', handleBreakpoint);
  }, [onDismiss]);

  return (
    <dialog
      aria-label="Mobile navigation"
      className="mobile-navigation-dialog fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(18rem,calc(100vw-2rem))] max-w-none border-0 bg-transparent p-0 text-cabinet-text md:hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
      onClose={() => {
        const restoreFocus = !suppressFocusRestore.current;
        suppressFocusRestore.current = false;
        onDismiss(restoreFocus);
      }}
      ref={dialogRef}
    >
      <Sidebar
        activeSectionId={activeSectionId}
        id="mobile-sidebar"
        mobile
        onNavigate={onNavigate}
        onRequestClose={() => dialogRef.current?.close()}
      />
    </dialog>
  );
}
