import type { Request, Response } from "express";
import type { Reservation } from "@campushub/shared";
import {
  cancelReservation,
  createReservation,
  listReservationsForUser,
} from "../services/reservation.service.js";

// No try/catch: Express 5 forwards a rejected promise to middleware/errorHandler.ts,
// which maps domain errors to 400 / 404 / 409 and anything else to 500.

export async function postReservation(
  req: Request,
  res: Response<Reservation>,
): Promise<void> {
  res.status(201).json(await createReservation(req.body));
}

export async function getUserReservations(
  req: Request<{ userId: string }>,
  res: Response<Reservation[]>,
): Promise<void> {
  res.status(200).json(await listReservationsForUser(req.params.userId));
}

export async function patchCancelReservation(
  req: Request<{ id: string }>,
  res: Response<Reservation>,
): Promise<void> {
  res.status(200).json(await cancelReservation(req.params.id));
}
