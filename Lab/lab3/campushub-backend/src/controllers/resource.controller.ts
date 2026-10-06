import type { NextFunction, Request, Response } from "express";
import { listResources } from "../services/resource.service.js";
import type { Resource } from "../types/reservation.js";

// Failures go to next(err); error.controller.ts maps them to 400 / 409 / 500.

export async function getResources(
  req: Request,
  res: Response<Resource[]>,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(200).json(await listResources(req.query["type"]));
  } catch (err) {
    next(err);
  }
}
