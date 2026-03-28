import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createHandlerPair,
  loadMessageHandler,
  type HandlerResult,
} from "./helpers";
import { redisStub } from "./mocks/redisStub";

describe("messageHandler authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BEARER_TOKEN = "expected-secret";
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_WINDOW_SECONDS;
    redisStub.incr.mockResolvedValue(1);
    redisStub.expire.mockResolvedValue(1);
    redisStub.set.mockResolvedValue("OK");
    redisStub.get.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function expectAuthorizedPost(result: HandlerResult) {
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Message stored");
    expect(redisStub.set).toHaveBeenCalledTimes(1);
  }

  describe("OPTIONS", () => {
    it("returns 204 with CORS headers and does not require auth or Redis", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "OPTIONS",
        headers: { origin: "http://localhost:5173" },
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(204);
      expect(result.ended).toBe(true);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(result.headers["Access-Control-Allow-Methods"]).toBe(
        "GET, POST, OPTIONS",
      );
      expect(result.headers["Access-Control-Allow-Headers"]).toBe(
        "authorization, content-type",
      );
      expect(result.headers["Access-Control-Max-Age"]).toBe("86400");
      expect(redisStub.incr).not.toHaveBeenCalled();
      expect(redisStub.get).not.toHaveBeenCalled();
      expect(redisStub.set).not.toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: {},
        body: { text: "hello" },
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(401);
      expect(result.body).toBe("Unauthorized");
      expect(redisStub.set).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization is not a Bearer token", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { authorization: "Basic abc" },
        body: { text: "hello" },
      });

      await handler(req, res);

      expect(getResult().statusCode).toBe(401);
      expect(redisStub.set).not.toHaveBeenCalled();
    });

    it("returns 401 when Bearer token does not match server token", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { authorization: "Bearer wrong" },
        body: { text: "hello" },
      });

      await handler(req, res);

      expect(getResult().statusCode).toBe(401);
      expect(redisStub.set).not.toHaveBeenCalled();
    });

    it("returns 401 when BEARER_TOKEN env is unset (even if client sends a token)", async () => {
      delete process.env.BEARER_TOKEN;
      vi.resetModules();
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { authorization: "Bearer expected-secret" },
        body: { text: "hello" },
      });

      await handler(req, res);

      expect(getResult().statusCode).toBe(401);
      expect(redisStub.set).not.toHaveBeenCalled();
    });

    it("returns 200 and stores message when Bearer token matches", async () => {
      const handler = await loadMessageHandler();
      const payload = { text: "hi", size: 18 };
      const { req, res, getResult } = createHandlerPair({
        method: "POST",
        headers: { authorization: "Bearer expected-secret" },
        body: payload,
      });

      await handler(req, res);

      const result = getResult();
      await expectAuthorizedPost(result);
      expect(redisStub.set).toHaveBeenCalledWith("message", payload);
    });
  });

  describe("GET", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "GET",
        headers: {},
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(401);
      expect(result.body).toBe("Unauthorized");
      expect(redisStub.get).not.toHaveBeenCalled();
    });

    it("returns 401 when Bearer token is wrong", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "GET",
        headers: { authorization: "Bearer nope" },
      });

      await handler(req, res);

      expect(getResult().statusCode).toBe(401);
      expect(redisStub.get).not.toHaveBeenCalled();
    });

    it("returns 404 when authorized and Redis has no message", async () => {
      redisStub.get.mockResolvedValueOnce(null);
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "GET",
        headers: { authorization: "Bearer expected-secret" },
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(404);
      expect(result.body).toBe("No message found");
      expect(redisStub.get).toHaveBeenCalledWith("message");
    });

    it("returns 200 with stored message when authorized", async () => {
      const stored = { text: "from-redis", animation: "stars" as const };
      redisStub.get.mockResolvedValueOnce(stored);
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "GET",
        headers: { authorization: "Bearer expected-secret" },
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual(stored);
    });
  });

  describe("unsupported methods", () => {
    it("treats DELETE like GET branch (rate limit + auth + get message)", async () => {
      const handler = await loadMessageHandler();
      const { req, res, getResult } = createHandlerPair({
        method: "DELETE",
        headers: { authorization: "Bearer expected-secret" },
      });

      await handler(req, res);

      const result = getResult();
      expect(result.statusCode).toBe(404);
      expect(redisStub.get).toHaveBeenCalledTimes(1);
    });
  });
});
