import { Request, Response } from "express";
import { AppDataSource } from '../config/db';
import { Subscription } from "../entity/Subscription";
import { Customer } from "../entity/Customer";

export const createSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      type,
      name,
      maxEmployees,
      maxStorage,
      storageUnit,
      isPrivate,
      isRecommended,
      price,
      planDuration,
      currency,
      modules,
      additionalInformation,
      briefBenifitLine
    } = req.body;
    const subscriptionRepo = AppDataSource.getRepository(Subscription);


    // Create and save the subscription
    const subscription = subscriptionRepo.create({
      type,
      name,
      maxEmployees,
      maxStorage,
      storageUnit,
      isPrivate,
      isRecommended,
      isDelete: false,
      price,
      planDuration,
      currency,
      modules,
      additionalInformation,
      briefBenifitLine,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await subscriptionRepo.save(subscription);

    return res.status(201).json({ message: "Subscription created", subscription });

  } catch (error) {
    console.error("Create subscription error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getSubscriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const subscriptionRepo = AppDataSource.getRepository(Subscription);

    const [subscriptions, total] = await subscriptionRepo.findAndCount({
      where: { isDelete: false },
      relations: ["customer"],
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: subscriptions,
    });

  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
