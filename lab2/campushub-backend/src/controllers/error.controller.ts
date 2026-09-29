import type { NextFunction, Request, Response } from "express";
import {
  ConflictError,
  DomainError,
  ValidationError,
} from "../services/domain.errors.js";
import type { ErrorResponse } from "../types/reservation.js";

function statusFor(err: DomainError): number {
  if (err instanceof ValidationError) {
    return 400;
  }
  if (err instanceof ConflictError) {
    return 409;
  }
  return 500;
}

// express.json() raises a SyntaxError tagged with this `type` for malformed bodies.
function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}

export function notFound(req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({
    code: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

export function handleError(
  err: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof DomainError) {
    res.status(statusFor(err)).json({ code: err.code, message: err.message });
    return;
  }
  if (isJsonParseError(err)) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Request body is not valid JSON.",
    });
    return;
  }
  console.error(err);
  // Generic body only: driver errors and stack traces must never reach a client.
  res
    .status(500)
    .json({ code: "INTERNAL_ERROR", message: "Internal Server Error" });
}
