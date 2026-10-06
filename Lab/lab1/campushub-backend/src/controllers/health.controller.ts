import type { NextFunction, Request, Response } from "express";
import { getHealthStatus } from "../services/health.service.js";

export function getHealth(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    res.status(200).json(getHealthStatus());
  } catch (err) {
    next(err);
  }
}
