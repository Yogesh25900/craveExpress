import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  initiateEsewa, esewaSuccess, esewaFailure, initiateSchema,
} from "../controllers/payments.controller";

const router = Router();

router.post("/esewa/initiate", requireAuth, validate(initiateSchema), initiateEsewa);
router.get ("/esewa/success",  esewaSuccess);
router.get ("/esewa/failure",  esewaFailure);

export default router;
