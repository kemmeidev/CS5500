import type { NextFunction, Request, Response } from "express";

interface IErrorBody {
  error: {
    status: number;
    message: string;
  };
}

function errorBody(status: number, message: string): IErrorBody {
  return { error: { status, message } };
}

export function notFound(req: Request, res: Response): void {
  res
    .status(404)
    .json(errorBody(404, `Cannot ${req.method} ${req.originalUrl}`));
}

export function handleError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error(err);
  // Generic body only: driver errors and stack traces must never reach a client.
  res.status(500).json(errorBody(500, "Internal Server Error"));
}
