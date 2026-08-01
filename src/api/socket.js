import { io } from "socket.io-client";

let socket = null;

/**
 * Lazily creates a single shared connection (same relay server as v1).
 *
 * WebSocket only, with NO polling fallback. The relay runs on Vercel, which is
 * serverless: long-polling spreads one session across several HTTP requests
 * that must all hit the same process, and Vercel gives no such affinity — the
 * send POST fails with "xhr post error". Listing "polling" as a fallback would
 * only mean that a momentary WebSocket failure downgrades the client to a
 * transport that cannot work at all, turning a blip into a dead connection.
 */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, { autoConnect: true, transports: ["websocket"] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
