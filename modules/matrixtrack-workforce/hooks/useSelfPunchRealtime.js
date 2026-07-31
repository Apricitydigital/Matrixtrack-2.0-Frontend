import { useEffect } from "react";
import { getSocketClient } from "../lib/socket";

export const useSelfPunchRealtime = (handler) => {
  useEffect(() => {
    const socket = getSocketClient();

    const onNewRequest = (payload) => {
      if (typeof handler === "function") {
        handler(payload || {});
      }
    };

    socket.on("new_self_punch_request", onNewRequest);

    return () => {
      socket.off("new_self_punch_request", onNewRequest);
    };
  }, [handler]);
};