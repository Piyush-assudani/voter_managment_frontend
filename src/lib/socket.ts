'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api';

export interface VoterVotedEvent {
  voterId: string;
  sqlId?: number;
  epic?: string;
  voted: boolean;
  votedAt?: string | null;
  wardNo?: string;
  partNo?: string;
  organizationId?: string;
  ts?: number;
}

export interface VoterUpdatedEvent {
  voterId: string;
  sqlId?: number;
  epic?: string;
  wardNo?: string;
  partNo?: string;
  voted?: boolean;
  migrant?: boolean;
  caste?: string;
  supportLevel?: string;
  phone?: string;
  serialNo?: number;
  nameHi?: string;
  organizationId?: string;
  ts?: number;
}

export interface DispatchUpdatedEvent {
  dispatchId: string;
  status: string;
  voterId?: string;
  organizationId?: string;
  ts?: number;
}

export interface RealtimeEventMap {
  'voter:voted': (payload: VoterVotedEvent) => void;
  'voter:updated': (payload: VoterUpdatedEvent) => void;
  'voters:bulk-updated': (payload: Record<string, unknown>) => void;
  'dispatch:updated': (payload: DispatchUpdatedEvent) => void;
}

let sharedSocket: Socket | null = null;
let clientListenerAttached = false;

function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5002';
  }
  return API_BASE_URL.replace(/\/api\/?$/, '') || 'https://vijaysetu.piyushassudani.in';
}

export function getOrgSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('token');
  if (!token) return null;

  const organizationId = window.localStorage.getItem('selectedClientOrgId') || '';

  if (!sharedSocket) {
    sharedSocket = io(getSocketUrl(), {
      auth: { token, organizationId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15000,
      timeout: 10000,
    });
  } else {
    sharedSocket.auth = { token, organizationId };
    if (!sharedSocket.connected) {
      sharedSocket.connect();
    }
  }

  if (!clientListenerAttached) {
    clientListenerAttached = true;
    window.addEventListener('client-changed', (evt: Event) => {
      const detail = (evt as CustomEvent<{ organizationId?: string }>)?.detail;
      const nextOrgId = detail?.organizationId ?? window.localStorage.getItem('selectedClientOrgId') ?? '';
      if (sharedSocket) {
        sharedSocket.auth = {
          token: window.localStorage.getItem('token') || '',
          organizationId: nextOrgId,
        };
        if (sharedSocket.connected) {
          sharedSocket.emit('join-org', nextOrgId);
        }
      }
    });
  }

  return sharedSocket;
}

export function disconnectOrgSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}

/**
 * Subscribe to real-time organization-scoped Socket.IO events with zero stale closures.
 */
export function useRealtimeEvents(handlers: Partial<RealtimeEventMap>): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = getOrgSocket();
    if (!socket) return;

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onVoterVoted = (payload: VoterVotedEvent) => handlersRef.current['voter:voted']?.(payload);
    const onVoterUpdated = (payload: VoterUpdatedEvent) => handlersRef.current['voter:updated']?.(payload);
    const onBulkUpdated = (payload: Record<string, unknown>) => handlersRef.current['voters:bulk-updated']?.(payload);
    const onDispatchUpdated = (payload: DispatchUpdatedEvent) => handlersRef.current['dispatch:updated']?.(payload);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('voter:voted', onVoterVoted);
    socket.on('voter:updated', onVoterUpdated);
    socket.on('voters:bulk-updated', onBulkUpdated);
    socket.on('dispatch:updated', onDispatchUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('voter:voted', onVoterVoted);
      socket.off('voter:updated', onVoterUpdated);
      socket.off('voters:bulk-updated', onBulkUpdated);
      socket.off('dispatch:updated', onDispatchUpdated);
    };
  }, []);

  return { connected };
}

