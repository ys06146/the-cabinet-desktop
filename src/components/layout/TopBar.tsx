import { useState, type RefObject } from 'react';
import type { WorkspaceSectionId } from '../../domain/workspace';
import { useUpdateManager } from '../../hooks/use-update-manager';
import { Icon } from '../ui/Icon';

function updateStatusLabel(status: ReturnType<typeof useUpdateManager>['state']): string {
  if (!status) {
    return 'Updates · 상태 확인 중';
  }
  switch (status.status) {
    case 'idle':
      return 'Updates · 대기';
    case 'checking':
      return '업데이트 확인 중';
    case 'up-to-date':
      return '최신 버전';
    case 'available':
      return `v${status.availableVersion ?? '새 버전'} 업데이트 가능`;
    case 'downloading':
      return `업데이트 ${Math.round(status.progressPercent ?? 0)}%`;
    case 'downloaded':
      return '업데이트 재시작 대기';
    case 'error':
      return '업데이트 확인 오류';
  }
}

interface TopBarProps {
  activeSectionId: WorkspaceSectionId;
  currentTitle: string;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
  mobileNavigationOpen: boolean;
  onNavigate: (sectionId: WorkspaceSectionId) => void;
  onOpenMobileNavigation: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function TopBar({
  activeSectionId,
  currentTitle,
  mobileMenuButtonRef,
  mobileNavigationOpen,
  onNavigate,
  onOpenMobileNavigation,
  searchInputRef,
}: TopBarProps): React.JSX.Element {
  const [searchValue, setSearchValue] = useState('');
  const update = useUpdateManager();
  const updateLabel = update.actionError ? '업데이트 확인 오류' : updateStatusLabel(update.state);
  const canCheckUpdates =
    !update.loading &&
    update.pendingAction === null &&
    (update.state?.status === 'idle' ||
      update.state?.status === 'up-to-date' ||
      update.state?.status === 'error');
  const updateInProgress =
    update.pendingAction === 'check' ||
    update.state?.status === 'checking' ||
    update.state?.status === 'downloading';
  const updateDotClass =
    update.actionError || update.state?.status === 'error'
      ? 'bg-cabinet-negative'
      : update.state?.status === 'up-to-date' || update.state?.status === 'downloaded'
        ? 'bg-cabinet-positive'
        : 'bg-cabinet-warning';

  function handleOpenUpdates(): void {
    onNavigate('settings');
    if (canCheckUpdates) {
      void update.checkForUpdates();
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-cabinet-border bg-cabinet-surface/95 px-3 py-3 backdrop-blur-sm sm:px-5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-controls="mobile-sidebar"
          aria-expanded={mobileNavigationOpen}
          aria-label="Open navigation"
          className="flex size-11 shrink-0 items-center justify-center rounded-cabinet-sm border border-cabinet-border text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text md:hidden"
          id="mobile-navigation-toggle"
          onClick={onOpenMobileNavigation}
          ref={mobileMenuButtonRef}
          type="button"
        >
          <Icon name="menu" />
        </button>

        <div aria-atomic="true" aria-live="polite" className="min-w-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-cabinet-muted">
            Current space
          </p>
          <h1 className="truncate font-serif text-xl text-cabinet-text sm:text-2xl">{currentTitle}</h1>
        </div>

        <button
          aria-current={activeSectionId === 'settings' ? 'page' : undefined}
          aria-label="Open settings"
          className="ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-cabinet-sm border border-cabinet-border px-3 text-sm font-semibold text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text"
          onClick={() => onNavigate('settings')}
          type="button"
        >
          <Icon className="size-[1.15rem]" name="settings" />
          <span className="hidden xl:inline">Settings</span>
        </button>
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
        <form
          className="relative min-w-0 flex-1 lg:max-w-xl"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <label className="sr-only" htmlFor="workspace-search">
            Search the current workspace
          </label>
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-[1.1rem] -translate-y-1/2 text-cabinet-muted"
            name="search"
          />
          <input
            aria-keyshortcuts="Control+K Meta+K"
            className="h-11 w-full rounded-cabinet-md border border-cabinet-border bg-cabinet-background/60 pl-10 pr-14 text-sm text-cabinet-text placeholder:text-cabinet-muted/80 hover:border-cabinet-muted focus:border-cabinet-brass"
            id="workspace-search"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search this workspace"
            ref={searchInputRef}
            type="search"
            value={searchValue}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-cabinet-sm border border-cabinet-border px-1.5 py-0.5 font-mono text-[0.62rem] text-cabinet-muted sm:block">
            Ctrl K
          </kbd>
        </form>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            aria-describedby="topbar-update-status"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-3 text-sm font-bold text-cabinet-text hover:bg-cabinet-accent/80"
            onClick={handleOpenUpdates}
            title={
              canCheckUpdates
                ? '새 버전을 확인하고 업데이트 설정을 엽니다'
                : '업데이트 진행 상황과 설치 옵션을 확인합니다'
            }
            type="button"
          >
            <Icon
              className={`size-[1.15rem] ${updateInProgress ? 'motion-safe:animate-spin' : ''}`}
              name="update"
            />
            자동 업데이트
          </button>
          <span
            aria-label="Data source status: Mock Data"
            className="flex min-h-9 shrink-0 items-center gap-2 rounded-cabinet-sm border border-cabinet-border bg-cabinet-background/40 px-3 text-xs font-semibold text-cabinet-text"
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-cabinet-positive" />
            Mock Data
          </span>
          <span
            aria-atomic="true"
            aria-label={`업데이트 상태: ${updateLabel}`}
            className="flex min-h-9 items-center gap-2 rounded-cabinet-sm border border-cabinet-border bg-cabinet-background/40 px-3 text-xs text-cabinet-muted"
            id="topbar-update-status"
            role="status"
          >
            <span aria-hidden="true" className={`size-1.5 rounded-full ${updateDotClass}`} />
            {updateLabel}
          </span>
          {update.actionError ? (
            <p className="basis-full text-xs text-cabinet-negative" role="alert">
              {update.actionError}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
