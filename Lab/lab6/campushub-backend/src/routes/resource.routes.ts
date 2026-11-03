import { Router } from "express";
import { getResources } from "../controllers/resource.controller.js";

// Paths mirror docs/openapi.yaml; mounted under the spec's /api/v1 server URL.
const router: Router = Router();

router.get("/resources", getResources);

export default router;
