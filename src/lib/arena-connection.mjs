/** Commands are never buffered across a disconnect or automatically replayed. */
export function sendArenaRequest(socket, event, payload = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(Object.assign(new Error("Connection lost. Reconnect before sending another action."), { code: "OFFLINE" }));
      return;
    }
    socket.timeout(timeoutMs).volatile.emit(event, payload, (error, result) => {
      if (error) {
        reject(Object.assign(new Error("No response received. Refreshing the battle before you try again."), { code: "ACK_TIMEOUT" }));
      } else if (result?.ok === false) {
        reject(Object.assign(new Error(result.error?.message || result.error || "Action rejected."), { code: result.error?.code || "REJECTED" }));
      } else resolve(result || {});
    });
  });
}

export function savedBattleTarget(raw, userId) {
  try {
    const saved = JSON.parse(raw);
    return saved?.userId === userId && typeof saved.matchId === "string" && saved.matchId.length > 0 && saved.matchId.length < 100
      ? saved.matchId
      : null;
  } catch { return null; }
}

export function sessionConnectionError(error) {
  return error?.code === "UNAUTHENTICATED" || /sign in|session expired|suspended/i.test(error?.message || "");
}
