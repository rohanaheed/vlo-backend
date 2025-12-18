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
  deletePracticeArea,
  createSubcategory,
  deleteSubcategory,
  updateSubcategory,
  getSubcategoryById,
  getAllSubcategories,
  createCustomFieldGroup,
  deleteCustomFieldGroup,
  updateCustomFieldGroup,
  getCustomFieldGroupById,
  getAllCustomFieldGroups,
  createCustomField,
  getAllCustomFields,
  getCustomFieldById,
  updateCustomField,
  deleteCustomField
} from "../controllers/businessController";
import { validateRequest } from "../middleware/validateRequest";
import {
  businessTypeSchema,
  businessEntitySchema,
  businessPracticeAreaSchema,
  subcategorySchema,
  updateSubcategorySchema,
  updateCustomFieldGroupSchema,
  createCustomFieldGroupSchema
} from "../utils/validators/inputValidator";
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
router.get("/area/:id/", authorize(["super_admin"]), asyncHandler(getPracticeAreaById));
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



/**
 * Routes for subcategories
 * 
 * */
router.post(
  "/subcategory/",
  authorize(["super_admin"]),
  validateRequest(subcategorySchema),
  asyncHandler(createSubcategory)
);
router.get("/subcategory/", authorize(["super_admin"]), asyncHandler(getAllSubcategories));
router.get("/subcategory/:id", authorize(["super_admin"]), asyncHandler(getSubcategoryById));
router.put(
  "/subcategory/:id",
  authorize(["super_admin"]),
  validateRequest(updateSubcategorySchema),
  asyncHandler(updateSubcategory)
);
router.delete(
  "/subcategory/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteSubcategory)
);


/**
 * Routes for custom field groups
 * 
 * */

router.post(
  "/customfieldgroup/",
  authorize(["super_admin"]),
  validateRequest(createCustomFieldGroupSchema),
  asyncHandler(createCustomFieldGroup)
);
router.get("/customfieldgroup/", authorize(["super_admin"]), asyncHandler(getAllCustomFieldGroups));
router.get("/customfieldgroup/:id", authorize(["super_admin"]), asyncHandler(getCustomFieldGroupById));
router.put("/customfieldgroup/:id", authorize(["super_admin"]), validateRequest(updateCustomFieldGroupSchema), asyncHandler(updateCustomFieldGroup));
router.delete("/customfieldgroup/:id", authorize(["super_admin"]), asyncHandler(deleteCustomFieldGroup));

/**
 * Routes for custom fields
 */
router.post("/customfield/", authorize(["super_admin"]), asyncHandler(createCustomField));
router.get("/customfield/", authorize(["super_admin"]), asyncHandler(getAllCustomFields));
router.get("/customfield/:id", authorize(["super_admin"]), asyncHandler(getCustomFieldById));
router.put("/customfield/:id", authorize(["super_admin"]), asyncHandler(updateCustomField));
router.delete("/customfield/:id", authorize(["super_admin"]), asyncHandler(deleteCustomField));

export default router;