import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listRestaurants, getRestaurant, getMenu, getReviews, createReview,
  reviewSchema,
} from "../controllers/restaurants.controller";

const router = Router();

router.get ("/",                listRestaurants);
router.get ("/:slug",           getRestaurant);
router.get ("/:slug/menu",      getMenu);
router.get ("/:slug/reviews",   getReviews);
router.post("/:slug/reviews",   requireAuth, validate(reviewSchema), createReview);

export default router;
