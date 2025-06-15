import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import {  BusinessPracticeArea } from "../entity/BusinessPracticeArea";

const businessEntityRepo = AppDataSource.getRepository(BusinessEntity);
const practiceRepo = AppDataSource.getRepository(BusinessPracticeArea);
const businessTypeRepo = AppDataSource.getRepository(BusinessType);

export const createBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;
  const existing = await businessTypeRepo.findOneBy({ name });

  if (existing) {
    return res.status(409).json({ message: "BusinessType already exists" });
  }

  const newType = businessTypeRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await businessTypeRepo.save(newType);

  return res.status(201).json(newType);
};

export const getAllBusinessTypes = async (req: Request, res: Response): Promise<any> => {
  const types = await businessTypeRepo.find();
  return res.json(types);
};

export const getBusinessTypeById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const type = await businessTypeRepo.findOneBy({ id: Number(id) });

  if (!type) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  return res.json(type);
};

export const updateBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const type = await businessTypeRepo.findOneBy({ id: Number(id) });

  if (!type) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  type.name = name;
  type.updatedAt = new Date();
  await businessTypeRepo.save(type);

  return res.json(type);
};

export const deleteBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessType = await businessTypeRepo.findOne({ where: { id: Number(id) } });

  if (!businessType) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessType.isDelete = true;
  await businessTypeRepo.save(businessType);

  return res.json({ message: "BusinessType soft deleted successfully" });
};



export const createBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;

  const existing = await businessEntityRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "BusinessEntity already exists" });
  }

  const entity = businessEntityRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await businessEntityRepo.save(entity);
  return res.status(201).json(entity);
};

export const getAllBusinessEntities = async (req: Request, res: Response): Promise<any> => {
  const entities = await businessEntityRepo.find();
  return res.json(entities);
};

export const getBusinessEntityById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const entity = await businessEntityRepo.findOneBy({ id: Number(id) });

  if (!entity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  return res.json(entity);
};

export const updateBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const entity = await businessEntityRepo.findOneBy({ id: Number(id) });
  if (!entity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  entity.name = name;
  entity.updatedAt = new Date();
  await businessEntityRepo.save(entity);
  return res.json(entity);
};

export const deleteBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessEntity = await businessEntityRepo.findOne({ where: { id: Number(id) } });

  if (!businessEntity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessEntity.isDelete = true;
  await businessEntityRepo.save(businessEntity);

  return res.json({ message: "BusinessEntity soft deleted successfully" });
};




/**
 * Routes for business practice areas
 * 
 *
 * 
 * 
 *  */





export const createPracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;

  const existing = await practiceRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "Already exists" });
  }

  const area = practiceRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await practiceRepo.save(area);
  return res.status(201).json(area);
};

export const getAllPracticeAreas = async (req: Request, res: Response): Promise<any> => {
  const areas = await practiceRepo.find();
  return res.json(areas);
};

export const getPracticeAreaById = async (req: Request, res: Response): Promise<any> => {
  const area = await practiceRepo.findOneBy({ id: Number(req.params.id) });
  if (!area) return res.status(404).json({ message: "Not found" });

  return res.json(area);
};

export const updatePracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const area = await practiceRepo.findOneBy({ id: Number(id) });
  if (!area) return res.status(404).json({ message: "Not found" });

  area.name = name;
  area.updatedAt = new Date();
  await practiceRepo.save(area);
  return res.json(area);
};

export const deletePracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessarea = await practiceRepo.findOne({ where: { id: Number(id) } });

  if (!businessarea) {
    return res.status(404).json({ message: "Business practice area not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessarea.isDelete = true;
  businessarea.updatedAt = new Date();
  await businessTypeRepo.save(businessarea);

  return res.json({ message: "Business practice area soft deleted successfully" });
};



