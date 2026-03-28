import type { VercelRequest, VercelResponse } from "@vercel/node";

import { Redis } from "@upstash/redis";

// Initialize Redis
const redis = Redis.fromEnv();

const RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.RATE_LIMIT_MAX_REQUESTS ?? 5,
);
const RATE_LIMIT_WINDOW_SECONDS = Number(
  process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60,
);

const getClientIp = (req: VercelRequest) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
};

async function rateLimitClient(req: VercelRequest): Promise<boolean> {
  const clientIp = getClientIp(req);
  const rateLimitKey = `message_post_rate_limit:${clientIp}`;
  const currentCount = await redis.incr(rateLimitKey);
  if (currentCount === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  }
  if (currentCount > RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  return true;
}

/** Make sure it's me */
function authenticate(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const incomingBearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  const serverBearer = process.env.BEARER_TOKEN;
  return !!serverBearer && incomingBearer === serverBearer;
}

export default async function messageHandler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { method } = req;

  switch (method) {
    case "OPTIONS": {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "authorization, content-type",
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(204).end();
      return;
    }

    case "POST": {
      // not too many requests
      let fewEnoughReqs = await rateLimitClient(req);
      if (!fewEnoughReqs) {
        res.setHeader("Retry-After", RATE_LIMIT_WINDOW_SECONDS.toString());
        res.status(429).send("Too many requests");
        return;
      }

      if (!authenticate(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const result = await redis.set("message", req.body);

      if (result !== "OK") {
        res.status(500).send("An Error Occurred");
        return;
      }

      res.status(200).send("Message stored");
      return;
    }

    case "GET":
    default:
      let fewEnoughReqs = await rateLimitClient(req);
      if (!fewEnoughReqs) {
        res.setHeader("Retry-After", RATE_LIMIT_WINDOW_SECONDS.toString());
        res.status(429).send("Too many requests");
        return;
      }

      if (!authenticate(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const response = await redis.get("message");
      if (response === null || response === undefined) {
        res.status(404).send("No message found");
        return;
      }
      res.status(200).send(response);
      return;
  }
}
