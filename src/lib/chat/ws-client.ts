// The real WS client (COM-AP-002): plain WebSocket per `tech-stack.md` — JWT upgrade, server-
// resolved rooms, heartbeat, exponential backoff (1 s → 30 s cap, jitter), re-subscribe + catch-
// up on reconnect. Screens bind the realtime stream through `realtime.ts`; in Stage 2 the
// fixture bus feeds the same event shapes, and this client takes over in Stage 5 (05 §4/§8).
export type ChatSocketLike = {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (
    type: "open" | "message" | "close" | "error",
    handler: (event?: { data?: unknown }) => void,
  ) => void;
};

export type WsServerEvent = Record<string, unknown> & { type?: string };

/** Opaque timer handle — the injectable clock wraps the host's timer id. */
export type Timer = { id: number };

export type ChatSocketOptions = {
  url: string;
  getToken: () => string | null;
  /** Rooms the server may allow — intersected server-side; kept for re-subscribe. */
  rooms: () => string[];
  onEvent: (event: WsServerEvent) => void;
  onStateChange: (state: "connecting" | "online" | "offline") => void;
  /** Catch-up hook fired after each successful (re)connect, before re-subscribe. */
  onReconnect?: () => void;
  /** Injectable socket constructor (tests). */
  makeSocket?: (url: string) => ChatSocketLike;
  /** Injectable timers (tests). */
  setTimeoutFn?: (fn: () => void, delay: number) => Timer;
  clearTimeoutFn?: (id: Timer) => void;
  /** Injectable clock (tests). */
  now?: () => number;
};

const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;
/**
 * No frame at all (not even the `pong` to our `ping`) for this long means the link died without
 * a close event (Wi-Fi ↔ mobile switch, NAT drop): the socket is dropped and re-dialled instead of
 * sitting "online" while every event is lost.
 */
export const STALE_AFTER_MS = 2 * HEARTBEAT_MS + 10_000;

export function createChatSocket(options: ChatSocketOptions): {
  connect: () => void;
  disconnect: () => void;
  send: (type: string, payload: Record<string, unknown>) => void;
} {
  const setTimeoutFn = options.setTimeoutFn ?? ((fn: () => void, delay: number): Timer => ({ id: Number(setTimeout(fn, delay)) }));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((id: Timer): void => {
    clearTimeout(id.id);
  });
  const makeSocket: (url: string) => ChatSocketLike =
    options.makeSocket ?? ((url) => new WebSocket(url));
  const now = options.now ?? Date.now;

  let socket: ChatSocketLike | null = null;
  let attempts = 0;
  let heartbeat: Timer | null = null;
  let reconnectTimer: Timer | null = null;
  let closedByUser = false;
  let everConnected = false;
  let lastFrameAt = 0;

  function scheduleReconnect(): void {
    if (closedByUser || reconnectTimer) return;
    attempts += 1;
    const base = Math.min(1_000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
    const jitter = base * (0.7 + Math.random() * 0.3); // jitter so fleets don't stampede
    options.onStateChange("offline");
    reconnectTimer = setTimeoutFn(() => {
      reconnectTimer = null;
      connect();
    }, jitter);
  }

  function startHeartbeat(): void {
    stopHeartbeat();
    heartbeat = setTimeoutFn(() => {
      heartbeat = null;
      if (now() - lastFrameAt > STALE_AFTER_MS) {
        dropStale();
        return;
      }
      send("ping", {});
      startHeartbeat();
    }, HEARTBEAT_MS);
  }

  /** The silent-dead link: forget it (its late close is ignored) and re-dial on the backoff. */
  function dropStale(): void {
    const dead = socket;
    socket = null;
    try {
      dead?.close();
    } catch {
      // already gone
    }
    scheduleReconnect();
  }

  function stopHeartbeat(): void {
    if (heartbeat) {
      clearTimeoutFn(heartbeat);
      heartbeat = null;
    }
  }

  function connect(): void {
    if (closedByUser) return;
    const token = options.getToken();
    if (!token) {
      options.onStateChange("offline");
      scheduleReconnect();
      return;
    }
    options.onStateChange("connecting");
    const current = makeSocket(`${options.url}?token=${encodeURIComponent(token)}`);
    socket = current;

    // Every handler ignores a socket that was replaced (dropped as stale, or disconnected).
    current.addEventListener("open", () => {
      if (socket !== current) return;
      attempts = 0;
      lastFrameAt = now();
      options.onStateChange("online");
      const isReconnect = everConnected;
      everConnected = true;
      if (isReconnect) options.onReconnect?.(); // catch-up from the REST cursor first…
      send("subscribe", { rooms: options.rooms() }); // …then re-subscribe (05 §2 reconnect contract)
      startHeartbeat();
    });
    current.addEventListener("message", (event) => {
      if (socket !== current) return;
      lastFrameAt = now();
      try {
        options.onEvent(JSON.parse(String(event?.data)) as WsServerEvent);
      } catch {
        // Malformed frames are ignored — unknown events are additive by contract (05 §7).
      }
    });
    current.addEventListener("close", () => {
      if (socket !== current) return;
      stopHeartbeat();
      socket = null;
      scheduleReconnect();
    });
    current.addEventListener("error", () => {
      // close always follows error; nothing to do here but avoid unhandled noise.
    });
  }

  function send(type: string, payload: Record<string, unknown>): void {
    socket?.send(JSON.stringify({ type, ...payload }));
  }

  function disconnect(): void {
    closedByUser = true;
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeoutFn(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    options.onStateChange("offline");
  }

  return { connect, disconnect, send };
}
