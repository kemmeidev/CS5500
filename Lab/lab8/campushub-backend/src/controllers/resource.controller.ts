import type { Request, Response } from "express";
import type { Resource } from "@campushub/shared";
import { listResources } from "../services/resource.service.js";

// No try/catch: Express 5 forwards a rejected promise to middleware/errorHandler.ts.

export async function getResources(
  req: Request,
  res: Response<Resource[]>,
): Promise<void> {
  res
    .status(200)
    .json(await listResources(req.query["type"], req.query["isAvailable"]));
}
