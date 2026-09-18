import { describe, expect, it, vi } from 'vitest';
import { createEmptyGameAtelierData } from '../../domain/game-atelier-data';
import {
  GameProjectWorkspaceValidationError,
  createDefaultGameProjectWorkspace,
} from '../../domain/game-project-workspace';
import type { GameProjectDataProvider } from '../../providers/game-project/game-project-data-provider';
import { GameProjectDataService } from './game-project-data-service';

describe('GameProjectDataService workspace persistence boundary', () => {
  it('loads only the requested workspace through the narrow provider method', async () => {
    const data = createEmptyGameAtelierData();
    const workspace = createDefaultGameProjectWorkspace('midnight-archive');
    const loadWorkspace = vi
      .fn<GameProjectDataProvider['loadWorkspace']>()
      .mockResolvedValue(workspace);
    const provider: GameProjectDataProvider = {
      load: vi.fn().mockResolvedValue(data),
      loadWorkspace,
      saveProject: vi.fn().mockResolvedValue(data),
      saveWorkspace: vi.fn().mockResolvedValue(data),
    };

    await expect(
      new GameProjectDataService(provider).loadWorkspace('midnight-archive'),
    ).resolves.toEqual(workspace);
    expect(loadWorkspace).toHaveBeenCalledWith('midnight-archive');
  });

  it('validates and forwards a workspace through the provider interface', async () => {
    const data = createEmptyGameAtelierData();
    const saveWorkspace = vi.fn<GameProjectDataProvider['saveWorkspace']>().mockResolvedValue(data);
    const provider: GameProjectDataProvider = {
      load: vi.fn().mockResolvedValue(data),
      loadWorkspace: vi.fn().mockResolvedValue(null),
      saveProject: vi.fn().mockResolvedValue(data),
      saveWorkspace,
    };
    const service = new GameProjectDataService(provider);
    const workspace = createDefaultGameProjectWorkspace('midnight-archive');

    await expect(service.saveWorkspace('midnight-archive', workspace)).resolves.toEqual(data);
    expect(saveWorkspace).toHaveBeenCalledWith('midnight-archive', workspace);
  });

  it('rejects malformed workspace state before invoking the provider', async () => {
    const data = createEmptyGameAtelierData();
    const saveWorkspace = vi.fn<GameProjectDataProvider['saveWorkspace']>().mockResolvedValue(data);
    const provider: GameProjectDataProvider = {
      load: vi.fn().mockResolvedValue(data),
      loadWorkspace: vi.fn().mockResolvedValue(null),
      saveProject: vi.fn().mockResolvedValue(data),
      saveWorkspace,
    };
    const service = new GameProjectDataService(provider);
    const workspace = createDefaultGameProjectWorkspace('midnight-archive');
    const malformed = {
      ...workspace,
      scene: { ...workspace.scene, gridVisible: 'yes' },
    };

    expect(() =>
      service.saveWorkspace('midnight-archive', malformed as never),
    ).toThrow(GameProjectWorkspaceValidationError);
    expect(saveWorkspace).not.toHaveBeenCalled();
  });
});
