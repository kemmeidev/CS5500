import { Router } from "express";
import {
  getUserReservations,
  patchCancelReservation,
  postReservation,
} from "../controllers/reservation.controller.js";

// Paths mirror docs/openapi.yaml; mounted under the spec's /api/v1 server URL.
const router: Router = Router();

router.post("/reservations", postReservation);
router.get("/reservations/user/:userId", getUserReservations);
router.patch("/reservations/:id/cancel", patchCancelReservation);

export default router;
