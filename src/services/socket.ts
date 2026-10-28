import type { Socket } from 'socket.io-client';
import { tokenStorage } from './api';

let socket: Socket | null = null;
let isConnecting = false;
let onlineCount = 1;

type EventCallback = (data: any) => void;
const listeners: Map<string, Set<EventCallback>> = new Map();
const presenceListeners: Set<(count: number) => void> = new Set();

// Cross-tab synchronization via standard BroadcastChannel API
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('campushub_realtime_sync');
    broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type && listeners.has(type)) {
        listeners.get(type)?.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('BroadcastChannel callback error:', e);
          }
        });
      }
    };
  }
} catch {
  // Graceful fallback if BroadcastChannel is restricted
}

function dispatchEvent(event: string, payload: any, propagateCrossTab = true) {
  if (listeners.has(event)) {
    listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  if (propagateCrossTab && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: event, data: payload });
    } catch {}
  }
}

export function getSocket(): Socket | null {
  try {
    if (typeof window === 'undefined') return null;

    if (!socket && !isConnecting) {
      isConnecting = true;
      const token = tokenStorage.get();

      import('socket.io-client')
        .then(({ io }) => {
          if (!socket) {
            socket = io(window.location.origin, {
              auth: { token: token || undefined },
              autoConnect: true,
              transports: ['polling', 'websocket'],
              reconnectionAttempts: 10,
              reconnectionDelay: 2000,
              timeout: 10000
            });

            socket.on('connect', () => {
              // Socket connected
              const currentToken = tokenStorage.get();
              if (currentToken) {
                socket?.emit('authenticate', { token: currentToken });
              }
            });

            // Presence tracking
            socket.on('presence:count', (data: { onlineCount: number }) => {
              if (data && typeof data.onlineCount === 'number') {
                onlineCount = data.onlineCount;
                presenceListeners.forEach((cb) => cb(onlineCount));
              }
            });

            // Real-time events forwarding to subscribers
            const standardEvents = [
              'post:created',
              'post:deleted',
              'post:liked',
              'comment:created',
              'opportunity:created',
              'opportunity:favorited',
              'resource:created',
              'resource:downloaded',
              'group:created',
              'group:updated',
              'settings:updated',
              'notification:new',
              'new_message',
              'conversation_updated',
              'user_typing'
            ];

            standardEvents.forEach((evt) => {
              socket?.on(evt, (payload: any) => {
                dispatchEvent(evt, payload, true);
              });
            });

            socket.on('connect_error', (err) => {
              console.warn('Socket connection retry notice:', err.message);
            });
          }
        })
        .catch((err) => {
          console.warn('Socket client initialization fallback:', err);
        })
        .finally(() => {
          isConnecting = false;
        });
    }

    return socket;
  } catch (err) {
    console.warn('getSocket safe fallback:', err);
    return null;
  }
}

// Subscribe to real-time events across all devices & tabs
export function subscribeToRealtimeEvent<T = any>(
  event: string,
  callback: (data: T) => void
): () => void {
  // Ensure socket is initialized
  getSocket();

  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback as EventCallback);

  return () => {
    listeners.get(event)?.delete(callback as EventCallback);
  };
}

// Subscribe to live online device/student count
export function subscribePresence(callback: (count: number) => void): () => void {
  getSocket();
  presenceListeners.add(callback);
  callback(onlineCount);
  return () => {
    presenceListeners.delete(callback);
  };
}

// Re-authenticate existing socket when user logs in or out
export function reauthenticateSocket(token?: string) {
  const effectiveToken = token || tokenStorage.get();
  if (socket && socket.connected) {
    socket.emit('authenticate', { token: effectiveToken || undefined });
  } else {
    // If not connected yet, initialize
    getSocket();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
