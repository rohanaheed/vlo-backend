import { Request, Response, NextFunction, RequestHandler } from "express";
import { ObjectSchema } from "joi";

export const validateRequest = (schema: ObjectSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        message: "Validation error",
        details: error.details.map(detail => detail.message),
      });
      return; // <-- important: stop execution here
    }
    next();
  };
};
