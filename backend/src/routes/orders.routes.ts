import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  placeOrder, listOrders, getOrder, orderSse, cancelOrder, validateCoupon,
  placeOrderSchema,
} from "../controllers/orders.controller";

const router = Router();
router.use(requireAuth);

router.post("/",                validate(placeOrderSchema), placeOrder);
router.get ("/",                listOrders);
router.post("/coupons/validate",                            validateCoupon);
router.get ("/:id",             getOrder);
router.get ("/:id/sse",         orderSse);
router.patch("/:id/cancel",     cancelOrder);

export default router;
