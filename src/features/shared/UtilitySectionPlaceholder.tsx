import { EmptyState } from '../../components/ui/EmptyState';
import type { WorkspaceSectionId } from '../../domain/workspace';
import { UpdateSettings } from '../settings/UpdateSettings';

type UtilitySectionId = Exclude<WorkspaceSectionId, 'market-room' | 'game-atelier'>;
type PlaceholderSectionId = Exclude<UtilitySectionId, 'settings'>;

const utilityContent: Record<
  PlaceholderSectionId,
  { description: string; eyebrow: string; title: string }
> = {
  'saved-items': {
    eyebrow: 'Personal library',
    title: 'Nothing saved yet',
    description:
      'Research references and atelier materials you choose to keep will be gathered here in a later stage.',
  },
  notes: {
    eyebrow: 'Private folios',
    title: 'No notes have been written',
    description:
      'Investment and game design notes will live here after their storage model is explicitly introduced.',
  },
};

interface UtilitySectionPlaceholderProps {
  sectionId: UtilitySectionId;
}

export function UtilitySectionPlaceholder({
  sectionId,
}: UtilitySectionPlaceholderProps): React.JSX.Element {
  if (sectionId === 'settings') {
    return <UpdateSettings />;
  }

  const content = utilityContent[sectionId];

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] items-center px-4 py-10 sm:px-8 lg:px-12">
      <EmptyState {...content} />
    </div>
  );
}
