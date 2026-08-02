import { io, type Socket } from "socket.io-client";
import { getToken, clearTokens } from "./session";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

function createSocket(): Socket {
  return io("/", {
    path: "/socket.io",
    auth: (cb) => cb({ token: getToken() }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
}

export function connectSocket(): Socket {
  if (socket?.connected) {
    console.log("[socket] reuse existing connection");
    return socket;
  }

  if (socket) {
    console.log("[socket] replacing stale socket (previous listeners cleared)");
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = createSocket();
  console.log("[socket] created new socket connection");

  socket.on("connect", () => {
    console.log("[socket] connected id=" + socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error:", err.message);
    if (err.message === "Unauthorized") {
      const token = getToken();
      if (!token) {
        console.warn("[socket] no token available — session expired");
        clearTokens();
        window.dispatchEvent(new Event("mb:session-expired"));
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected reason=" + reason);
    if (reason === "io server disconnect") {
      // Server-side disconnect — handshake token might be stale.
      // Socket.IO built-in reconnection re-runs the auth callback on each
      // attempt, so getToken() will return the latest token automatically.
    }
  });

  socket.io.on("error", (err: Error) => {
    console.error("[socket] transport error:", err.message);
  });

  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): Socket {
  disconnectSocket();
  return connectSocket();
}
