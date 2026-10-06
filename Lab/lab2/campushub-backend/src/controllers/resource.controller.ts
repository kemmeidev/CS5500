import type { NextFunction, Request, Response } from "express";
import { listResources } from "../services/resource.service.js";
import type { Resource } from "../types/reservation.js";

export function getResources(
  req: Request,
  res: Response<Resource[]>,
  next: NextFunction,
): void {
  try {
    res.status(200).json(listResources(req.query["type"]));
  } catch (err) {
    next(err);
  }
}
