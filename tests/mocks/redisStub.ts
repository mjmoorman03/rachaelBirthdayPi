import { vi } from "vitest";

/** Shared stub returned by `Redis.fromEnv()` in `api/message.ts` (see `tests/setup.ts`). */
export const redisStub = {
  incr: vi.fn<[], Promise<number>>(),
  expire: vi.fn<[], Promise<number>>(),
  set: vi.fn<[], Promise<"OK" | null>>(),
  get: vi.fn<[], Promise<unknown>>(),
};
