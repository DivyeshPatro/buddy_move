import pino from "pino";
import { randomUUID } from "crypto";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.token",
      "body.refreshToken",
      "body.firebaseIdToken",
      "body.code",
      "body.otp",
      "body.password",
      "body.aadhaarNumber",
      "body.licenceNumber",
      "body.selfieImage",
      "body.licenceImageUrl",
      "body.aadhaarImageUrl",
      "body.vehicleRcNumber",
      "body.vehicleRcImageUrl",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: { "content-type": req.headers?.["content-type"], "user-agent": req.headers?.["user-agent"] },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export function requestLogger(req: any, res: any, next: any) {
  const requestId = randomUUID();
  req.requestId = requestId;
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        userId: (req as any).auth?.sub,
      },
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`
    );
  });
  next();
}
