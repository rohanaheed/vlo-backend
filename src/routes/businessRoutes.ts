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


/**
 * Routes for business type
 * 
 * */


router.post(
  "/type/",
  // authorize(["super-admin"]), // optional: restrict creation
  validateRequest(businessTypeSchema),
  asyncHandler(createBusinessType)
);

router.get("/type/", asyncHandler(getAllBusinessTypes));

router.get("/type/:id", asyncHandler(getBusinessTypeById));

router.put(
  "/type/:id",
  // authorize(["super-admin"]), // optional
  validateRequest(businessTypeSchema),
  asyncHandler(updateBusinessType)
);

router.delete(
  "/type/:id",
  // authorize(["super-admin"]), // optional
  asyncHandler(deleteBusinessType)
);

/**
 * Routes for business entity
 * 
 * */

router.post(
  "/entity/",
  // authorize(["super-admin"]), // optional: restrict creation
  validateRequest(businessEntitySchema),
  asyncHandler(createBusinessEntity)
);

router.get("/entity/", asyncHandler(getAllBusinessEntities));

router.get("/entity/:id", asyncHandler(getBusinessEntityById));

router.put(
  "/entity/:id",
  // authorize(["super-admin"]), // optional
  validateRequest(businessEntitySchema),
  asyncHandler(updateBusinessEntity)
);

router.delete(
  "/entity/:id",
  // authorize(["super-admin"]), // optional
  asyncHandler(deleteBusinessEntity)
);

/**
 * Routes for business practice areas
 * 
 * */


router.post(
  "/area/",
  // authorize(["super-admin"]), // optional: restrict creation
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(createPracticeArea)
);

router.get("/area/", asyncHandler(getAllPracticeAreas));

router.get("/area/:id", asyncHandler(getPracticeAreaById));

router.put(
  "/area/:id",
  // authorize(["super-admin"]), // optional
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(updatePracticeArea)
);

router.delete(
  "/area/:id",
  // authorize(["super-admin"]), // optional
  asyncHandler(deletePracticeArea)
);


export default router;