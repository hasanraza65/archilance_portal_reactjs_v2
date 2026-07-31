import { io } from "socket.io-client";

let socket = null;

/** Lazily creates a single shared connection (same relay server as v1). */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, { autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
