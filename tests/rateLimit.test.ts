import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHandlerPair, loadMessageHandler } from "./helpers";
import { redisStub } from "./mocks/redisStub";

describe("messageHandler rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BEARER_TOKEN = "secret";
    process.env.RATE_LIMIT_MAX_REQUESTS = "3";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "42";
    redisStub.expire.mockResolvedValue(1);
    redisStub.set.mockResolvedValue("OK");
    redisStub.get.mockResolvedValue({ text: "x" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("POST", () => {
    it("allows up to RATE_LIMIT_MAX_REQUESTS then returns 429 with Retry-After", async () => {
      redisStub.incr
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);

      const handler = await loadMessageHandler();
      const auth = { authorization: "Bearer secret" };

      for (let i = 0; i < 3; i++) {
        const { req, res, getResult } = createHandlerPair({
          method: "POST",
          headers: { ...auth },
          body: { text: `msg-${i}` },
        });
        await handler(req, res);
        expect(getResult().statusCode).toBe(200);
      }

      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { ...auth },
        body: { text: "blocked" },
      });
      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(429);
      expect(result.body).toBe("Too many requests");
      expect(result.headers["Retry-After"]).toBe("42");
      expect(redisStub.set).toHaveBeenCalledTimes(3);
    });

    it("does not authenticate or write when over limit", async () => {
      redisStub.incr.mockResolvedValue(99);

      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { authorization: "Bearer wrong" },
        body: { text: "ignored" },
      });

      await handler(req, res);

      expect(getResult().statusCode).toBe(429);
      expect(redisStub.set).not.toHaveBeenCalled();
    });

    it("uses the first x-forwarded-for IP when present", async () => {
      let call = 0;
      redisStub.incr.mockImplementation(async () => {
        call += 1;
        return call;
      });

      const handler = await loadMessageHandler();
      const headers = {
        authorization: "Bearer secret",
        "x-forwarded-for": "198.51.100.2, 10.0.0.1",
      };

      const { req, res } = createHandlerPair({
        method: "POST",
        headers,
        body: { text: "a" },
      });
      await handler(req, res);

      expect(redisStub.incr).toHaveBeenCalledWith(
        "message_post_rate_limit:198.51.100.2",
      );
    });
  });

  describe("GET", () => {
    it("shares the same per-IP counter as POST", async () => {
      redisStub.incr
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);

      const handler = await loadMessageHandler();
      const auth = { authorization: "Bearer secret" };
      const sameIp = { socket: { remoteAddress: "203.0.113.99" } };

      const post1 = createHandlerPair({
        method: "POST",
        headers: { ...auth },
        body: { text: "1" },
        ...sameIp,
      });
      await handler(post1.req, post1.res);
      expect(post1.getResult().statusCode).toBe(200);

      const get1 = createHandlerPair({
        method: "GET",
        headers: { ...auth },
        ...sameIp,
      });
      await handler(get1.req, get1.res);
      expect(get1.getResult().statusCode).toBe(200);

      const post2 = createHandlerPair({
        method: "POST",
        headers: { ...auth },
        body: { text: "2" },
        ...sameIp,
      });
      await handler(post2.req, post2.res);
      expect(post2.getResult().statusCode).toBe(200);

      const get2 = createHandlerPair({
        method: "GET",
        headers: { ...auth },
        ...sameIp,
      });
      await handler(get2.req, get2.res);

      expect(get2.getResult().statusCode).toBe(429);
      expect(get2.getResult().headers["Retry-After"]).toBe("42");
    });
  });
});
