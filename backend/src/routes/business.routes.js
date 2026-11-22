
import { Router } from "express";

import {
  listBusinesses,
  getBusiness,
} from "../controllers/business.controller.js";

const router = Router();

router.get("/", listBusinesses);
router.get("/:id", getBusiness);

export default router;
