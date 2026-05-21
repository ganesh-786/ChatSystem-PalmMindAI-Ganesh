import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function createSocket(token) {
  return io(socketUrl, {
    auth: { token },
    withCredentials: true,
    transports: ["websocket"],
  });
}

export function disconnectSocket(socket) {
  if (socket && socket.disconnect) {
    socket.disconnect();
  }
}
