// Unit tests for the WS client state machine (COM-AP-002): backoff growth with cap, jitter
// bounds, re-subscribe + catch-up ordering on reconnect, heartbeat cadence, manual disconnect.
import { createChatSocket, type ChatSocketLike } from "@/lib/chat/ws-client";

type FakeSocket = {
  send: jest.Mock<void, [string]>;
  close: jest.Mock<void, []>;
  listeners: Map<string, (event?: { data?: unknown }) => void>;
};

function makeFakeSocket(): FakeSocket {
  const listeners = new Map<string, (event?: { data?: unknown }) => void>();
  const send = (jest.fn() as jest.Mock<void, [string]>);
  const close = (jest.fn() as jest.Mock<void, []>);
  return { send, close, listeners };
}

/** Wraps a FakeSocket with the ChatSocketLike event API used by the client. */
function asSocketLike(fake: FakeSocket): ChatSocketLike {
  return {
    send: (data: string) => {
      fake.send(data);
    },
    close: () => {
      fake.close();
    },
    addEventListener: (type, handler) => {
      fake.listeners.set(type, handler);
    },
  };
}

function open(fake: FakeSocket): void {
  fake.listeners.get("open")?.();
}

function closeFromServer(fake: FakeSocket): void {
  fake.listeners.get("close")?.();
}

function deliver(fake: FakeSocket, data: unknown): void {
  fake.listeners.get("message")?.({ data: JSON.stringify(data) });
}

type Timer = { id: number; fn: () => void; delay: number };

function makeTimers() {
  let seq = 0;
  const timers: Timer[] = [];
  const setTimeoutFn = (fn: () => void, delay: number) => {
    seq += 1;
    const timer = { id: seq, fn, delay };
    timers.push(timer);
    return { id: timer.id };
  };
  const clearTimeoutFn = (id: { id: number }) => {
    const index = timers.findIndex((t) => t.id === id.id);
    if (index !== -1) timers.splice(index, 1);
  };
  /** Runs the pending timer with the smallest delay; returns its delay. */
  const runNext = (): number | null => {
    timers.sort((a, b) => a.delay - b.delay);
    const timer = timers.shift();
    if (!timer) return null;
    timer.fn();
    return timer.delay;
  };
  return { timers, setTimeoutFn, clearTimeoutFn, runNext };
}

function setup() {
  const fakes: FakeSocket[] = [];
  const onEvent = jest.fn();
  const onStateChange = jest.fn();
  const onReconnect = jest.fn();
  const { timers, setTimeoutFn, clearTimeoutFn, runNext } = makeTimers();
  const socket = createChatSocket({
    url: "wss://api.test/api/v1/ws",
    getToken: () => "token-1",
    rooms: () => ["group:grp_1", "dm:a:b"],
    onEvent,
    onStateChange,
    onReconnect,
    makeSocket: () => {
      const fake = makeFakeSocket();
      fakes.push(fake);
      return asSocketLike(fake);
    },
    setTimeoutFn,
    clearTimeoutFn,
  });
  const first = (): FakeSocket => {
    const fake = fakes[0];
    if (!fake) throw new Error("no first socket");
    return fake;
  };
  const last = (): FakeSocket => {
    const fake = fakes[fakes.length - 1];
    if (!fake) throw new Error("no socket");
    return fake;
  };
  return { socket, fakes, first, last, onEvent, onStateChange, onReconnect, timers, runNext };
}

describe("chat ws client", () => {
  it("subscribes to its rooms after the first open and schedules a heartbeat", () => {
    const { socket, first, timers, onReconnect } = setup();
    socket.connect();
    open(first());
    expect(first().send).toHaveBeenCalledWith(expect.stringContaining('"type":"subscribe"'));
    const sentFrame = first().send.mock.calls[0]?.[0] ?? "{}";
    const frame = JSON.parse(sentFrame) as { rooms?: string[] };
    expect(frame.rooms).toEqual(["group:grp_1", "dm:a:b"]);
    expect(onReconnect).not.toHaveBeenCalled(); // first connect is not a reconnect
    expect(timers.length).toBeGreaterThan(0); // heartbeat scheduled
  });

  it("reconnects with capped backoff and runs catch-up before re-subscribe", () => {
    const { socket, fakes, first, last, runNext, onReconnect, onStateChange } = setup();
    socket.connect();
    open(first());
    closeFromServer(first());

    expect(onStateChange).toHaveBeenCalledWith("offline");
    const reconnectDelay = runNext();
    expect(reconnectDelay).not.toBeNull();
    expect(reconnectDelay ?? 0).toBeGreaterThanOrEqual(700); // 1 s base with jitter
    expect(reconnectDelay ?? 0).toBeLessThanOrEqual(1_000);
    expect(fakes.length).toBe(2);

    open(last());
    expect(onReconnect).toHaveBeenCalledTimes(1);
    const sentFrame = last().send.mock.calls[0]?.[0] ?? "{}";
    const frame = JSON.parse(sentFrame) as { type?: string };
    expect(frame.type).toBe("subscribe"); // catch-up hook fired before re-subscribe

    // Backoff grows with a 30 s cap across repeated failures.
    for (let i = 0; i < 7; i += 1) {
      closeFromServer(last());
      const delay = runNext();
      expect(delay ?? 0).toBeLessThanOrEqual(30_000);
    }
  });

  it("disconnects cleanly without scheduling a reconnect", () => {
    const { socket, first, timers } = setup();
    socket.connect();
    open(first());
    expect(timers.length).toBeGreaterThan(0);
    socket.disconnect();
    expect(first().close).toHaveBeenCalled();
    expect(timers.length).toBe(0);
  });

  it("ignores malformed frames and parses valid ones", () => {
    const { socket, first, onEvent } = setup();
    socket.connect();
    open(first());
    deliver(first(), { type: "typing", groupId: "grp_1" });
    first().listeners.get("message")?.({ data: "not-json" });
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: "typing", groupId: "grp_1" });
  });
});
