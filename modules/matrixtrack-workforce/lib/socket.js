import { io } from "socket.io-client";
import { API_ORIGIN } from "../config";

let socketInstance = null;

export const getSocketClient = () => {
  if (!socketInstance) {
    socketInstance = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }

  return socketInstance;
};