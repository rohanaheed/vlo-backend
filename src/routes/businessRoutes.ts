import { Router } from "express";
import {
  createBusinessType,
  getAllBusinessTypes,
  getBusinessTypeById,
  updateBusinessType,
  deleteBusinessType,
  createBusinessEntity,
  getAllBusinessEntities,
  getBusinessEntityById,
  updateBusinessEntity,
  deleteBusinessEntity,
  createPracticeArea,
  getAllPracticeAreas,
  getPracticeAreaById,
  updatePracticeArea,
  deletePracticeArea
} from "../controllers/businessController";
import { validateRequest } from "../middleware/validateRequest";
import { businessTypeSchema, businessEntitySchema, businessPracticeAreaSchema } from "../utils/validators/inputValidator";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();


router.post(
  "/type/",
  authorize(["super_admin"]),
  validateRequest(businessTypeSchema),
  asyncHandler(createBusinessType)
);


router.get("/type/", authorize(["super_admin"]), asyncHandler(getAllBusinessTypes));
router.get("/type/:id", authorize(["super_admin"]), asyncHandler(getBusinessTypeById));
router.put(
  "/type/:id",
  authorize(["super_admin"]),
  validateRequest(businessTypeSchema),
  asyncHandler(updateBusinessType)
);
router.delete(
  "/type/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteBusinessType)
);

/**
 * Routes for business entity
 * 
 * */


router.post(
  "/entity/",
  authorize(["super_admin"]),
  validateRequest(businessEntitySchema),
  asyncHandler(createBusinessEntity)
);
router.get("/entity/", authorize(["super_admin"]), asyncHandler(getAllBusinessEntities));
router.get("/entity/:id", authorize(["super_admin"]), asyncHandler(getBusinessEntityById));
router.put(
  "/entity/:id",
  authorize(["super_admin"]),
  validateRequest(businessEntitySchema),
  asyncHandler(updateBusinessEntity)
);
router.delete(
  "/entity/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteBusinessEntity)
);

/**
 * Routes for business practice areas
 * 
 * */
router.post(
  "/area/",
  authorize(["super_admin"]),
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(createPracticeArea)
);
router.get("/area/", authorize(["super_admin"]), asyncHandler(getAllPracticeAreas));
router.get("/area/:id", authorize(["super_admin"]), asyncHandler(getPracticeAreaById));
router.put(
  "/area/:id",
  authorize(["super_admin"]),
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(updatePracticeArea)
);
router.delete(
  "/area/:id",
  authorize(["super_admin"]),
  asyncHandler(deletePracticeArea)
);


export default router;