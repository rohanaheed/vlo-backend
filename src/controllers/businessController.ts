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

  const newType = businessTypeRepo.create({ name });
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
  await businessTypeRepo.save(type);

  return res.json(type);
};

export const deleteBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const result = await businessTypeRepo.delete(Number(id));

  if (result.affected === 0) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  return res.json({ message: "Deleted successfully" });
};



export const createBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;

  const existing = await businessEntityRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "BusinessEntity already exists" });
  }

  const entity = businessEntityRepo.create({ name });
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
  await businessEntityRepo.save(entity);
  return res.json(entity);
};

export const deleteBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const result = await businessEntityRepo.delete(Number(id));

  if (result.affected === 0) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  return res.json({ message: "Deleted successfully" });
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

  const area = practiceRepo.create({ name });
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
  await practiceRepo.save(area);
  return res.json(area);
};

export const deletePracticeArea = async (req: Request, res: Response): Promise<any> => {
  const result = await practiceRepo.delete(Number(req.params.id));
  if (result.affected === 0) {
    return res.status(404).json({ message: "Not found" });
  }

  return res.json({ message: "Deleted successfully" });
};



