import { useEffect, useState } from 'react';
import { updateSaveCoordinator } from './services/update-save-coordinator';
import { WorkspaceShell } from '../components/layout/WorkspaceShell';
import type { WorkspaceSectionId } from '../domain/workspace';
import { GameAtelier } from '../features/game-atelier/GameAtelier';
import { MarketRoom } from '../features/market-room/MarketRoom';
import { UtilitySectionPlaceholder } from '../features/shared/UtilitySectionPlaceholder';
import { reportApplicationError } from '../lib/report-error';

const UPDATE_SAVE_FAILURE_MESSAGE =
  '작성 중인 메모나 게임 프로젝트를 저장하지 못했습니다. 저장 상태를 확인한 뒤 다시 시도해 주세요.';

function renderSection(sectionId: WorkspaceSectionId): React.JSX.Element | null {
  switch (sectionId) {
    case 'market-room':
      return null;
    case 'game-atelier':
      return <GameAtelier />;
    case 'saved-items':
    case 'notes':
    case 'settings':
      return <UtilitySectionPlaceholder sectionId={sectionId} />;
  }
}

export function App(): React.JSX.Element {
  const [activeSectionId, setActiveSectionId] =
    useState<WorkspaceSectionId>('market-room');

  useEffect(() => {
    const unsubscribe = window.theCabinet.onPrepareUpdateInstall(({ requestId }) => {
      void (async () => {
        try {
          await updateSaveCoordinator.flushAll();
        } catch (error: unknown) {
          reportApplicationError(error);
          try {
            await window.theCabinet.completeUpdatePreparation({
              requestId,
              success: false,
              message: UPDATE_SAVE_FAILURE_MESSAGE,
            });
          } catch (responseError: unknown) {
            reportApplicationError(responseError);
          }
          return;
        }

        try {
          await window.theCabinet.completeUpdatePreparation({
            requestId,
            success: true,
          });
        } catch (error: unknown) {
          reportApplicationError(error);
        }
      })();
    });

    return unsubscribe;
  }, []);

  return (
    <WorkspaceShell
      activeSectionId={activeSectionId}
      onSectionChange={setActiveSectionId}
    >
      <div hidden={activeSectionId !== 'market-room'}>
        <MarketRoom />
      </div>
      {renderSection(activeSectionId)}
    </WorkspaceShell>
  );
}
