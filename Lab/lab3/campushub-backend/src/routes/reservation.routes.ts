import { Router } from "express";
import {
  getUserReservations,
  postReservation,
} from "../controllers/reservation.controller.js";
import { getResources } from "../controllers/resource.controller.js";

// Paths mirror docs/openapi.yaml; mounted under the spec's /api/v1 server URL.
const router: Router = Router();

router.get("/resources", getResources);
router.post("/reservations", postReservation);
router.get("/reservations/user/:userId", getUserReservations);

export default router;
