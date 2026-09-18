import { RoomPlaceholder } from '../../components/rooms/RoomPlaceholder';
import { getRoomDefinition } from '../../domain/workspace';

const room = getRoomDefinition('game-atelier');

export function GameAtelierPlaceholder(): React.JSX.Element {
  return <RoomPlaceholder folio="02" room={room} />;
}
