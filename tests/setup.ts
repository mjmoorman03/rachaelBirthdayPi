import { vi } from "vitest";

import { redisStub } from "./mocks/redisStub";

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => redisStub,
  },
}));
