import { Router } from "express";
import authRoutes        from "./auth.routes";
import restaurantRoutes  from "./restaurants.routes";
import categoryRoutes    from "./categories.routes";
import orderRoutes       from "./orders.routes";
import ownerRoutes       from "./owner.routes";
import adminRoutes       from "./admin.routes";
import riderRoutes       from "./rider.routes";
import paymentRoutes     from "./payments.routes";

const router = Router();

router.use("/auth",        authRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/categories",  categoryRoutes);
router.use("/orders",      orderRoutes);
router.use("/payments",    paymentRoutes);
router.use("/owner",       ownerRoutes);
router.use("/admin",       adminRoutes);
router.use("/rider",       riderRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "CraveExpress API v1" });
});

export default router;
