import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireOwner } from "../middleware/owner";
import { validate } from "../middleware/validate";
import {
  ownerSse, getRestaurant, updateRestaurant,
  listCategories, createCategory, updateCategory, deleteCategory,
  listMenu, createMenuItem, updateMenuItem, deleteMenuItem,
  listOrders, getOrder, updateOrderStatus, analytics,
  updateRestaurantSchema, menuCategorySchema, menuItemSchema,
} from "../controllers/owner.controller";

const router = Router();

// SSE registered with auth inline so headers can be set before the shared guard
router.get("/sse", requireAuth, requireOwner, ownerSse);

router.use(requireAuth, requireOwner);

router.get   ("/restaurant",        getRestaurant);
router.put   ("/restaurant",        validate(updateRestaurantSchema), updateRestaurant);

router.get   ("/categories",        listCategories);
router.post  ("/categories",        validate(menuCategorySchema), createCategory);
router.put   ("/categories/:id",    validate(menuCategorySchema), updateCategory);
router.delete("/categories/:id",    deleteCategory);

router.get   ("/menu",              listMenu);
router.post  ("/menu",              validate(menuItemSchema), createMenuItem);
router.put   ("/menu/:id",          validate(menuItemSchema.partial()), updateMenuItem);
router.delete("/menu/:id",          deleteMenuItem);

router.get   ("/orders",            listOrders);
router.get   ("/orders/:id",        getOrder);
router.patch ("/orders/:id/status", updateOrderStatus);

router.get   ("/analytics",         analytics);

export default router;
