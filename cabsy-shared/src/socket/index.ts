export {
  AckError,
  connectSocket,
  disconnectSocket,
  driverEvents,
  emitWithAck,
  getSocket,
  isSocketConnected,
  onSocketEvent,
  riderEvents,
} from './client';
export type { AckEnvelope } from './client';

export { useSocketEmit, useSocketEvent, useSocketStatus } from './hooks';
export type { SocketStatus } from './hooks';
