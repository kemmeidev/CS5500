import type { NextFunction, Request, Response } from "express";
import {
  createReservation,
  listActiveReservationsForUser,
} from "../services/reservation.service.js";
import type { Reservation } from "../types/reservation.js";

// Failures go to next(err); error.controller.ts maps them to 400 / 409 / 500.

export async function postReservation(
  req: Request,
  res: Response<Reservation>,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(201).json(await createReservation(req.body));
  } catch (err) {
    next(err);
  }
}

export async function getUserReservations(
  req: Request<{ userId: string }>,
  res: Response<Reservation[]>,
  next: NextFunction,
): Promise<void> {
  try {
    res
      .status(200)
      .json(await listActiveReservationsForUser(req.params.userId));
  } catch (err) {
    next(err);
  }
}
