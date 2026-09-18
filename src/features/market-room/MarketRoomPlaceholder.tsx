import { RoomPlaceholder } from '../../components/rooms/RoomPlaceholder';
import { getRoomDefinition } from '../../domain/workspace';

const room = getRoomDefinition('market-room');

export function MarketRoomPlaceholder(): React.JSX.Element {
  return <RoomPlaceholder folio="01" room={room} />;
}
