export type RoomId = 'market-room' | 'game-atelier';

export type WorkspaceSectionId = RoomId | 'saved-items' | 'notes' | 'settings';
export type WorkspaceNavigationGroup = 'rooms' | 'library' | 'system';

export interface RoomDefinition {
  id: RoomId;
  navigationLabel: string;
  issueLabel: string;
  title: string;
  description: string;
  previewItems: readonly string[];
}

export interface WorkspaceNavigationItem {
  id: WorkspaceSectionId;
  label: string;
  group: WorkspaceNavigationGroup;
}

export const ROOM_DEFINITIONS: readonly RoomDefinition[] = [
  {
    id: 'market-room',
    navigationLabel: 'Market Room',
    issueLabel: 'Research desk · reserved',
    title: 'Market Room',
    description:
      'A measured place for charts, signals, related reporting, themes, and private investment notes.',
    previewItems: ['Market charts', 'Technical indicators', 'Research notes'],
  },
  {
    id: 'game-atelier',
    navigationLabel: 'Game Atelier',
    issueLabel: 'Design desk · reserved',
    title: 'Game Atelier',
    description:
      'A quiet workshop for shaping a game idea into a Unity plan, a C# draft, and a small browser study.',
    previewItems: ['Concept notes', 'Unity planning', 'Prototype studies'],
  },
] as const;

export const WORKSPACE_NAVIGATION_ITEMS: readonly WorkspaceNavigationItem[] = [
  { id: 'market-room', label: 'Market Room', group: 'rooms' },
  { id: 'game-atelier', label: 'Game Atelier', group: 'rooms' },
  { id: 'saved-items', label: 'Saved Items', group: 'library' },
  { id: 'notes', label: 'Notes', group: 'library' },
  { id: 'settings', label: 'Settings', group: 'system' },
] as const;

export function getRoomDefinition(roomId: RoomId): RoomDefinition {
  const room = ROOM_DEFINITIONS.find((definition) => definition.id === roomId);
  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }
  return room;
}

export function getWorkspaceNavigationItem(
  sectionId: WorkspaceSectionId,
): WorkspaceNavigationItem {
  const item = WORKSPACE_NAVIGATION_ITEMS.find((candidate) => candidate.id === sectionId);
  if (!item) {
    throw new Error(`Unknown workspace section: ${sectionId}`);
  }
  return item;
}