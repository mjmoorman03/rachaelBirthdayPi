import type { VercelRequest, VercelResponse } from "@vercel/node";

export type HandlerResult = {
  statusCode: number;
  headers: Record<string, string | undefined>;
  body: unknown;
  ended: boolean;
};

/**
 * Minimal req/res pair compatible with `api/message.ts`.
 */
export function createHandlerPair(
  reqOverrides: Partial<VercelRequest> & { method?: string } = {},
): {
  req: VercelRequest;
  res: VercelResponse;
  getResult: () => HandlerResult;
} {
  const req = {
    method: "GET",
    headers: {} as VercelRequest["headers"],
    body: undefined,
    socket: { remoteAddress: "203.0.113.50" },
    ...reqOverrides,
  } as VercelRequest;

  if (reqOverrides.headers) {
    req.headers = reqOverrides.headers as VercelRequest["headers"];
  }

  let statusCode = 200;
  const headers: Record<string, string | undefined> = {};
  let body: unknown;
  let ended = false;

  const chain = {
    status(code: number) {
      statusCode = code;
      return chain;
    },
    setHeader(name: string, value: string | number) {
      headers[name] = String(value);
      return chain;
    },
    send(data?: unknown) {
      body = data;
      return chain;
    },
    end() {
      ended = true;
      return chain;
    },
  };

  return {
    req,
    res: chain as unknown as VercelResponse,
    getResult: () => ({ statusCode, headers, body, ended }),
  };
}

export async function loadMessageHandler() {
  const { default: messageHandler } = await import("../api/message");
  return messageHandler;
}
