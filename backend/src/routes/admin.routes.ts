import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { validate } from "../middleware/validate";
import * as ctrl from "../controllers/admin.controller";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get   ("/stats",              ctrl.stats);
router.get   ("/analytics",          ctrl.analytics);

router.get   ("/orders",             ctrl.listOrders);
router.get   ("/orders/:id",         ctrl.getOrder);
router.put   ("/orders/:id/status",  ctrl.updateOrderStatus);

router.get   ("/transactions",       ctrl.listTransactions);

router.get   ("/restaurants",        ctrl.listRestaurants);
router.post  ("/restaurants",        validate(ctrl.restaurantSchema), ctrl.createRestaurant);
router.put   ("/restaurants/:id",    validate(ctrl.restaurantSchema.partial()), ctrl.updateRestaurant);
router.delete("/restaurants/:id",    ctrl.deleteRestaurant);

router.get   ("/menu-items",         ctrl.listMenuItems);
router.post  ("/menu-items",         validate(ctrl.adminMenuItemSchema), ctrl.createMenuItem);
router.put   ("/menu-items/:id",     validate(ctrl.adminMenuItemSchema.partial()), ctrl.updateMenuItem);
router.delete("/menu-items/:id",     ctrl.deleteMenuItem);

router.get   ("/users",              ctrl.listUsers);
router.put   ("/users/:id/role",     ctrl.updateUserRole);
router.put   ("/users/:id/ban",      ctrl.toggleBanUser);

router.get   ("/coupons",            ctrl.listCoupons);
router.post  ("/coupons",            validate(ctrl.couponSchema), ctrl.createCoupon);
router.put   ("/coupons/:id",        validate(ctrl.couponSchema.partial()), ctrl.updateCoupon);
router.delete("/coupons/:id",        ctrl.deleteCoupon);
router.post  ("/coupons/validate",   ctrl.validateCoupon);

router.get   ("/settings",           ctrl.getSettings);
router.put   ("/settings",           ctrl.updateSettings);

router.get   ("/riders",             ctrl.listRiders);
router.post  ("/orders/:id/assign",  ctrl.assignRider);
router.delete("/orders/:id/assign",  ctrl.unassignRider);

router.get   ("/categories",         ctrl.listPlatformCategories);
router.post  ("/categories",         validate(ctrl.platformCatSchema), ctrl.createPlatformCategory);
router.put   ("/categories/:id",     validate(ctrl.platformCatSchema.partial()), ctrl.updatePlatformCategory);
router.delete("/categories/:id",     ctrl.deletePlatformCategory);

router.get   ("/audit-log",          ctrl.auditLog);

export default router;
