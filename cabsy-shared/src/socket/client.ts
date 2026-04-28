import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@env';
import { ClientEvents } from '../shared/events';

// Per master prompt §12: app env vars include SOCKET_URL.
// Android emulator: set SOCKET_URL=http://10.0.2.2:4000 in .env.

export type AckEnvelope<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export class AckError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AckError';
    this.code = code;
    this.details = details;
  }
}

interface SocketState {
  socket: Socket;
  token: string;
}

let state: SocketState | null = null;

function isAckEnvelope(value: unknown): value is AckEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { ok?: unknown };
  return typeof v.ok === 'boolean';
}

export function connectSocket(accessToken: string): void {
  if (state) {
    if (state.token === accessToken && state.socket.connected) return;
    if (state.token === accessToken) {
      // Same token, not yet connected — let the existing socket continue.
      return;
    }
    state.socket.disconnect();
    state = null;
  }

  const socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    console.log('[socket] connect_error', err.message);
  });

  state = { socket, token: accessToken };
}

export function disconnectSocket(): void {
  if (!state) return;
  state.socket.disconnect();
  state = null;
}

export function isSocketConnected(): boolean {
  return state?.socket.connected ?? false;
}

export function getSocket(): Socket | null {
  return state?.socket ?? null;
}

export function emitWithAck<T = unknown>(
  event: string,
  payload: unknown,
  timeoutMs: number = 8000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const socket = state?.socket;
    if (!socket || !socket.connected) {
      reject(new AckError('SOCKET_NOT_CONNECTED', 'Socket is not connected'));
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new AckError('ACK_TIMEOUT', `Ack timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.emit(event, payload, (response: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (!isAckEnvelope(response)) {
        reject(new AckError('ACK_MALFORMED', 'Malformed ack response'));
        return;
      }
      if (response.ok) {
        resolve((response.data as T) ?? (undefined as T));
        return;
      }
      reject(
        new AckError(
          response.error.code,
          response.error.message,
          response.error.details,
        ),
      );
    });
  });
}

export function onSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
): () => void {
  const socket = state?.socket;
  if (!socket) {
    return () => undefined;
  }
  const wrapped = (payload: T): void => handler(payload);
  socket.on(event, wrapped as (...args: unknown[]) => void);
  return () => {
    socket.off(event, wrapped as (...args: unknown[]) => void);
  };
}

export const driverEvents = {
  goOnline: (): Promise<void> =>
    emitWithAck<void>(ClientEvents.DriverGoOnline, {}),
  goOffline: (): Promise<void> =>
    emitWithAck<void>(ClientEvents.DriverGoOffline, {}),
  locationUpdate: (lat: number, lng: number): Promise<void> =>
    emitWithAck<void>(ClientEvents.DriverLocationUpdate, { lat, lng }),
  placeBid: <T = unknown>(rideId: string, amount: number): Promise<T> =>
    emitWithAck<T>(ClientEvents.DriverPlaceBid, { rideId, amount }),
  reviseBid: <T = unknown>(rideId: string, amount: number): Promise<T> =>
    emitWithAck<T>(ClientEvents.DriverReviseBid, { rideId, amount }),
  startRide: <T = unknown>(rideId: string): Promise<T> =>
    emitWithAck<T>(ClientEvents.DriverStartRide, { rideId }),
};

export const riderEvents = {
  joinRide: (rideId: string): Promise<void> =>
    emitWithAck<void>(ClientEvents.RiderJoinRide, { rideId }),
  acceptBid: <T = unknown>(rideId: string, bidId: string): Promise<T> =>
    emitWithAck<T>(ClientEvents.RiderAcceptBid, { rideId, bidId }),
  cancelRide: (rideId: string): Promise<void> =>
    emitWithAck<void>(ClientEvents.RiderCancelRide, { rideId }),
  completeRide: (rideId: string): Promise<void> =>
    emitWithAck<void>(ClientEvents.RideCompleteByDriver, { rideId }),
};
