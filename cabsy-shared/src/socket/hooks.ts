import { DependencyList, useEffect, useRef, useState } from 'react';
import {
  emitWithAck,
  getSocket,
  isSocketConnected,
  onSocketEvent,
} from './client';

export type SocketStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected';

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  deps: DependencyList = [],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const off = onSocketEvent<T>(event, (payload) => {
      handlerRef.current(payload);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export function useSocketEmit(): <T = unknown>(
  event: string,
  payload: unknown,
  timeoutMs?: number,
) => Promise<T> {
  return emitWithAck;
}

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(() =>
    isSocketConnected() ? 'connected' : 'idle',
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setStatus('idle');
      return;
    }

    if (socket.connected) {
      setStatus('connected');
    } else {
      setStatus('connecting');
    }

    const onConnect = (): void => setStatus('connected');
    const onDisconnect = (): void => setStatus('disconnected');
    const onConnectError = (): void => setStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return status;
}
