import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  getWorkspaceNavigationItem,
  type WorkspaceSectionId,
} from '../../domain/workspace';
import { AssistantLauncher } from './AssistantLauncher';
import { MobileSidebarDialog, Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface WorkspaceShellProps extends PropsWithChildren {
  activeSectionId: WorkspaceSectionId;
  onSectionChange: (sectionId: WorkspaceSectionId) => void;
}

export function WorkspaceShell({
  activeSectionId,
  onSectionChange,
  children,
}: WorkspaceShellProps): React.JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const currentSection = getWorkspaceNavigationItem(activeSectionId);

  const closeMobileNavigation = useCallback((restoreFocus = true): void => {
    setMobileNavigationOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    } else {
      window.requestAnimationFrame(() => document.getElementById('workspace-main')?.focus());
    }
  }, []);

  const handleNavigate = useCallback(
    (sectionId: WorkspaceSectionId): void => {
      onSectionChange(sectionId);
      setMobileNavigationOpen(false);
    },
    [onSectionChange],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarCollapsed((collapsed) => !collapsed);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <>
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>

      <div className="flex min-h-dvh min-w-0 bg-cabinet-background text-cabinet-text">
        <div
          className={`hidden h-dvh shrink-0 transition-[width] duration-150 md:block ${sidebarCollapsed ? 'w-[76px]' : 'w-[264px]'}`}
        >
          <Sidebar
            activeSectionId={activeSectionId}
            collapsed={sidebarCollapsed}
            id="desktop-sidebar"
            onNavigate={handleNavigate}
            onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
        </div>

        <MobileSidebarDialog
          activeSectionId={activeSectionId}
          onDismiss={closeMobileNavigation}
          onNavigate={handleNavigate}
          open={mobileNavigationOpen}
        />

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <TopBar
            activeSectionId={activeSectionId}
            currentTitle={currentSection.label}
            mobileMenuButtonRef={mobileMenuButtonRef}
            mobileNavigationOpen={mobileNavigationOpen}
            onNavigate={handleNavigate}
            onOpenMobileNavigation={() => setMobileNavigationOpen(true)}
            searchInputRef={searchInputRef}
          />

          <main
            aria-label={`${currentSection.label} content`}
            className="min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_88%_8%,rgb(var(--color-brass)/0.06),transparent_30%)] pb-24"
            id="workspace-main"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>

      <AssistantLauncher />
    </>
  );
}