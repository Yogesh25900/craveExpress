import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRider } from "../middleware/rider";
import {
  riderSse, setAvailability, availableOrders, activeOrder, deliveryHistory,
  earnings, getRiderOrder, acceptOrder, rejectOrder, updateOrderStatus, updateLocation,
} from "../controllers/rider.controller";

const router = Router();

// public SSE (token via query param for EventSource)
router.get("/sse", riderSse);

router.use(requireAuth, requireRider);

router.patch("/availability",       setAvailability);
router.get  ("/orders/available",   availableOrders);
router.get  ("/orders/active",      activeOrder);
router.get  ("/orders/history",     deliveryHistory);
router.get  ("/earnings",           earnings);
router.get  ("/orders/:id",         getRiderOrder);
router.patch("/orders/:id/accept",  acceptOrder);
router.patch("/orders/:id/reject",  rejectOrder);
router.patch("/orders/:id/status",  updateOrderStatus);
router.post ("/location",           updateLocation);

export default router;
