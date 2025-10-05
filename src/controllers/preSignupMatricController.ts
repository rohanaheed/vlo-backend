import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { PreSignupMatric } from "../entity/PreSignupMatric";
import { Subscription } from "../entity/Subscription";
import { Package } from "../entity/Package";

const metricRepo = AppDataSource.getRepository(PreSignupMatric);
const subscriptionRepo = AppDataSource.getRepository(Subscription);
const packageRepo = AppDataSource.getRepository(Package);


/**
 * @swagger
 * /api/pre-signup-metrics/growth-percentage:
 *   get:
 *     summary: Get pre-signup metrics growth percentage
 *     description: Returns the pre-signup metrics growth percentage for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [this_month, last_month, week, year, quarter]
 *           default: this_month
 *         description: |
 *           Filter the metrics by period:
 *             - `this_month`: Current month (default)
 *             - `last_month`: Previous month
 *             - `week`: Current week
 *             - `year`: Current year
 *             - `quarter`: Current quarter
 *     responses:
 *       200:
 *         description: Pre-signup metrics growth percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 stats:
 *                   type: array
 *                   description: Pre-signup metrics stats
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       value:
 *                         type: number
 *                         description: Metric value
 *       500:
 *         description: Error fetching pre-signup metrics growth percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getPreSignupMetrics = async (req: Request, res: Response): Promise<any> => {
  try {

    // View type: "this_month" | "last_month" | "week" etc.
    const view = (req.query.view as string) || "this_month";

    // Helper to compute date ranges
    const now = new Date();
    const getRange = (view: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;
        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;
        default:
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // Fetch current and previous period metrics in parallel for optimization
    const [currentMetrics, previousMetrics] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.date BETWEEN :start AND :end", { start, end })
        .groupBy("m.metricType")
        .getRawMany(),
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    // Map helper
    const getValue = (arr: any[], type: string): number => {
      return Number(arr.find((m) => m.metricType === type)?.value || 0);
    };

    const anonymousVisitors = getValue(currentMetrics, "anonymous_visitors");
    const leadMagnetEngagers = getValue(currentMetrics, "lead_magnet_engagers");
    const pricingPageBouncers = getValue(currentMetrics, "pricing_page_bouncers");

    const totalCurrent = anonymousVisitors + leadMagnetEngagers + pricingPageBouncers;
    const totalPrevious = previousMetrics.reduce((sum, m) => sum + Number(m.value || 0), 0);
    const growthPercentage = totalPrevious
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;

    return res.status(200).json({
      growthPercentage: Number(growthPercentage.toFixed(2)),
      stats: [
        { label: "Anonymous Visitors", value: anonymousVisitors },
        { label: "Lead Magnet Engagers", value: leadMagnetEngagers },
        { label: "Pricing Page Bouncers", value: pricingPageBouncers },
      ],
    });
  } catch (error) {
    console.error("Error in getPreSignupMetrics:", error);
    return res.status(500).json({
      message: "Error fetching pre-signup metrics",
      error: error instanceof Error ? error.message : error,
    });
  }
};


  /**
   * @swagger
   * /api/pre-signup-metrics/signup-abandonment:
   *   get:
   *     summary: Get signup abandonment metrics
   *     description: Returns the signup abandonment metrics for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
   *     tags:
   *       - Pre-Signup Metrics
   *     parameters:
   *       - in: query
   *         name: view
   *         schema:
   *           type: string
   *           enum: [this_month, last_month, week, year, quarter]
   *           default: this_month
   *         description: |
   *           Filter the metrics by period:
   *             - `this_month`: Current month (default)
   *             - `last_month`: Previous month
   *             - `week`: Current week
   *             - `year`: Current year
   *             - `quarter`: Current quarter
   *     responses:
   *       200:
   *         description: Signup abandonment metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 growthPercentage:
   *                   type: number
   *                   description: Growth percentage
   *                 stats:
   *                   type: array
   *                   description: Signup abandonment metrics
   *                   items:
   *                     type: object
   *                     properties:
   *                       label:
   *                         type: string
   *                         description: Metric label
   *                       value:
   *                         type: number
   *                         description: Metric value
   *       500:
   *         description: Error fetching signup abandonment metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 error:
   *                   type: string
   */
export const getSignupAbandonmentMetrics = async (req: Request, res: Response): Promise<any> => {
  try {
    const view = (req.query.view as string) || "this_month"; // this_month | week | last_month

    // 🧭 Helper for date ranges
    const now = new Date();
    const getRange = (view: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;

        default:
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // 🧮 Fetch current and previous period metrics in parallel
    const [
      currentMetrics,
      previousMetrics
    ] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .andWhere("m.metricType IN (:...types)", {
          types: ["form_abandoners", "oauth_dropoffs", "verification_ghosts"],
        })
        .groupBy("m.metricType")
        .getRawMany(),
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .andWhere("m.metricType IN (:...types)", {
          types: ["form_abandoners", "oauth_dropoffs", "verification_ghosts"],
        })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    // Helper to extract values
    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    // Current metric values
    const formAbandoners = getValue(currentMetrics, "form_abandoners");
    const oauthDropoffs = getValue(currentMetrics, "oauth_dropoffs");
    const verificationGhosts = getValue(currentMetrics, "verification_ghosts");

    // Totals and growth
    const totalCurrent = formAbandoners + oauthDropoffs + verificationGhosts;
    const totalPrevious = previousMetrics.reduce((sum, m) => sum + Number(m.value || 0), 0);
    const growthPercentage = totalPrevious
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;

    // ✅ Response
    return res.status(200).json({
      growthPercentage: Number(growthPercentage.toFixed(2)),
      stats: [
        { label: "Form Abandoners", value: formAbandoners },
        { label: "OAuth Drop-offs", value: oauthDropoffs },
        { label: "Verification Ghosts", value: verificationGhosts },
      ],
    });
  } catch (error) {
    console.error("Error in getSignupAbandonmentMetrics:", error);
    return res.status(500).json({
      message: "Error fetching signup abandonment metrics",
      error: error instanceof Error ? error.message : error,
    });
  }
};


/**
 * @swagger
 * /api/pre-signup-metrics/activation:
 *   get:
 *     summary: Get activation metrics
 *     description: Returns the activation metrics for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [this_month, last_month, week, year, quarter]
 *           default: this_month
 *         description: |
 *           Filter the metrics by period:
 *             - `this_month`: Current month (default)
 *             - `last_month`: Previous month
 *             - `week`: Current week
 *             - `year`: Current year
 *             - `quarter`: Current quarter
 *     responses:
 *       200:
 *         description: Activation metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 stats:
 *                   type: array
 *                   description: Activation metrics
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       value:
 *                         type: number
 *                         description: Metric value
 *       500:
 *         description: Error fetching activation metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getActivationMetrics = async (req: Request, res: Response): Promise<any> => {
  try {
    const view = (req.query.view as string) || "this_month"; // "this_month" | "week" | etc.

    // 🧭 Helper for date ranges
    const now = new Date();
    const getRange = (view: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;

        default:
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // 🧮 Current period metrics
    const currentMetrics = await metricRepo
      .createQueryBuilder("m")
      .select("m.metricType", "metricType")
      .addSelect("SUM(m.value)", "value")
      .where("m.category = :category", { category: "activation" })
      .andWhere("m.date BETWEEN :start AND :end", { start, end })
      .andWhere("m.metricType IN (:...types)", {
        types: ["feature_explorers", "integration_stuck", "team_invite_ghosts"],
      })
      .groupBy("m.metricType")
      .getRawMany();

    // 🕓 Previous period metrics (for growth)
    const previousMetrics = await metricRepo
      .createQueryBuilder("m")
      .select("m.metricType", "metricType")
      .addSelect("SUM(m.value)", "value")
      .where("m.category = :category", { category: "activation" })
      .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
      .andWhere("m.metricType IN (:...types)", {
        types: ["feature_explorers", "integration_stuck", "team_invite_ghosts"],
      })
      .groupBy("m.metricType")
      .getRawMany();

    // Helper
    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    // Extract individual values
    const featureExplorers = getValue(currentMetrics, "feature_explorers");
    const integrationStuck = getValue(currentMetrics, "integration_stuck");
    const teamInviteGhosts = getValue(currentMetrics, "team_invite_ghosts");

    // Totals and growth
    const totalCurrent = featureExplorers + integrationStuck + teamInviteGhosts;
    const totalPrevious = previousMetrics.reduce((sum, m) => sum + Number(m.value || 0), 0);
    const growthPercentage = totalPrevious
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;

    // ✅ Response
    return res.status(200).json({
      growthPercentage: Number(growthPercentage.toFixed(2)),
      stats: [
        { label: "Feature Explorers", value: featureExplorers },
        { label: "Integration Stuck", value: integrationStuck },
        { label: "Team Invite Ghosts", value: teamInviteGhosts },
      ],
    });
  } catch (error) {
    console.error("Error in getActivationMetrics:", error);
    return res.status(500).json({
      message: "Error fetching activation metrics",
      error: error instanceof Error ? error.message : error,
    });
  }
};


/**
 * @swagger
 * /api/pre-signup-metrics/retention-payment:
 *   get:
 *     summary: Get retention & payment metrics
 *     description: Returns the retention & payment metrics for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:  
 *           type: string
 *           enum: [this_month, last_month, week, year, quarter]
 *           default: this_month
 *         description: |
 *           Filter the metrics by period:
 *             - `this_month`: Current month (default)
 *             - `last_month`: Previous month
 *             - `week`: Current week
 *             - `year`: Current year
 *             - `quarter`: Current quarter
 *     responses:
 *       200:
 *         description: Retention & payment metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 stats:
 *                   type: array
 *                   description: Retention & payment metrics
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       value:
 *                         type: number
 *                         description: Metric value
 *       500:
 *         description: Error fetching retention & payment metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getRetentionPaymentMetrics = async (req: Request, res: Response): Promise<any> => {
  try {
    const view = (req.query.view as string) || "this_month"; // this_month | week | etc.

    // 🧭 Helper for date ranges
    const now = new Date();
    const getRange = (view: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;

        default:
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // 🧮 Current Period Metrics
    const currentMetrics = await metricRepo
      .createQueryBuilder("m")
      .select("m.metricType", "metricType")
      .addSelect("SUM(m.value)", "value")
      .where("m.category = :category", { category: "retention_payment" })
      .andWhere("m.date BETWEEN :start AND :end", { start, end })
      .andWhere("m.metricType IN (:...types)", {
        types: ["discount_hunters", "silent_churn_risks", "renewal_draggers"],
      })
      .groupBy("m.metricType")
      .getRawMany();

    // 🕓 Previous Period Metrics
    const previousMetrics = await metricRepo
      .createQueryBuilder("m")
      .select("m.metricType", "metricType")
      .addSelect("SUM(m.value)", "value")
      .where("m.category = :category", { category: "retention_payment" })
      .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
      .andWhere("m.metricType IN (:...types)", {
        types: ["discount_hunters", "silent_churn_risks", "renewal_draggers"],
      })
      .groupBy("m.metricType")
      .getRawMany();

    // Helper
    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    // Extract individual values
    const discountHunters = getValue(currentMetrics, "discount_hunters");
    const silentChurnRisks = getValue(currentMetrics, "silent_churn_risks");
    const renewalDraggers = getValue(currentMetrics, "renewal_draggers");

    // Totals and growth
    const totalCurrent = discountHunters + silentChurnRisks + renewalDraggers;
    const totalPrevious = previousMetrics.reduce((sum, m) => sum + Number(m.value || 0), 0);
    const growthPercentage = totalPrevious
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;

    // ✅ Response
    return res.status(200).json({
      growthPercentage: Number(growthPercentage.toFixed(2)),
      stats: [
        { label: "Discount Hunters", value: discountHunters },
        { label: "Silent Churn Risks", value: silentChurnRisks },
        { label: "Renewal Draggers", value: renewalDraggers },
      ],
    });
  } catch (error) {
    console.error("Error in getRetentionPaymentMetrics:", error);
    return res.status(500).json({
      message: "Error fetching retention & payment metrics",
      error: error instanceof Error ? error.message : error,
    });
  }
};


/**
 * @swagger
 * /api/pre-signup-metrics/plan-distribution:
 *   get:
 *     summary: Get plan distribution metrics
 *     description: Returns the plan distribution metrics for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [this_month, last_month, week, year, quarter]
 *           default: this_month
 *         description: |
 *           Filter the metrics by period:
 *             - `this_month`: Current month (default)
 *             - `last_month`: Previous month
 *             - `week`: Current week
 *             - `year`: Current year
 *             - `quarter`: Current quarter
 *     responses:
 *       200:
 *         description: Plan distribution metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:
 *                   type: number
 *                   description: Total number of customers
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 plans:
 *                   type: array
 *                   description: Plan distribution metrics
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       value:
 *                         type: number
 *                         description: Metric value
 *       500:
 *         description: Error fetching plan distribution metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getPlanDistribution = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("getPlanDistribution");

    const view = (req.query.view as string) || "this_month"; // "this_month" | "last_month" | "week" | "24hours"

    // 🧭 Helper — dynamic date ranges
    const now = new Date();
    const getRange = (view: string) => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view.toLowerCase()) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "last_month":
          start.setMonth(now.getMonth() - 1, 1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth(), 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;

        case "24hours":
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 1);
          prevEnd = new Date(end);
          prevEnd.setDate(end.getDate() - 1);
          break;

        default:
          // Default to monthly
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // 🧮 Current Period — group by plan
    const currentData = await subscriptionRepo
      .createQueryBuilder("subscription")
      .leftJoin(Package, "package", "package.id = subscription.packageId")
      .select("package.name", "planName")
      .addSelect("COUNT(DISTINCT subscription.customerId)", "count")
      .where("subscription.isDelete = false")
      .andWhere("package.isDelete = false")
      .andWhere("package.isActive = true")
      .andWhere("subscription.createdAt BETWEEN :start AND :end", { start, end })
      .groupBy("package.name")
      .getRawMany();

    // 🕓 Previous Period
    const previousData = await subscriptionRepo
      .createQueryBuilder("subscription")
      .leftJoin(Package, "package", "package.id = subscription.packageId")
      .select("package.name", "planName")
      .addSelect("COUNT(DISTINCT subscription.customerId)", "count")
      .where("subscription.isDelete = false")
      .andWhere("package.isDelete = false")
      .andWhere("package.isActive = true")
      .andWhere("subscription.createdAt BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
      .groupBy("package.name")
      .getRawMany();

    // 🔢 Helper — get count by plan name
    const getValue = (arr: any[], name: string) =>
      Number(arr.find((r) => r.planName === name)?.count || 0);

    // Plan order — can dynamically fetch later if needed
    const planNames = ["Basic", "Standard", "Medium", "Large"];

    const totalCurrent = currentData.reduce((sum, r) => sum + Number(r.count), 0);
    const totalPrevious = previousData.reduce((sum, r) => sum + Number(r.count), 0);

    // Avoid divide-by-zero
    const safeDivide = (a: number, b: number): number => (b === 0 ? 0 : a / b);

    // 🧮 Compute per-plan distribution and growth
    const plans = planNames.map((plan) => {
      const currentCount = getValue(currentData, plan);
      const previousCount = getValue(previousData, plan);

      const currentPercent = totalCurrent ? (currentCount / totalCurrent) * 100 : 0;
      const previousPercent = totalPrevious ? (previousCount / totalPrevious) * 100 : 0;

      const growth = previousPercent
        ? ((currentPercent - previousPercent) / previousPercent) * 100
        : 0;

      return {
        label: plan,
        value: Number(currentPercent.toFixed(2)),
        growth: Number(growth.toFixed(2)),
      };
    });

    // 📈 Overall Growth
    const overallGrowth = totalPrevious
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;

    // ✅ Response
    return res.status(200).json({
      view,
      totalCustomers: totalCurrent,
      growthPercentage: Number(overallGrowth.toFixed(2)),
      plans,
    });
  } catch (error) {
    console.error("Error in getPlanDistribution:", error);
    return res.status(500).json({
      message: "Error fetching plan distribution",
      error: error instanceof Error ? error.message : error,
    });
  }
};





/**
 * @swagger
 * /api/pre-signup-metrics/churn-prediction:
 *   get:
 *     summary: Get churn prediction metrics
 *     description: Returns the churn prediction metrics for the current and previous year. You can filter the results by year using the `year` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [this_year, last_year, custom]
 *           default: this_year
 *         description: |
 *           Filter the metrics by period:
 *             - `this_year`: Current year (default)
 *             - `last_year`: Previous year
 *             - `custom`: Custom year
 *     responses:
 *       200:
 *         description: Churn prediction metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 year:
 *                   type: number
 *                   description: Year
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 datasets:
 *                   type: array
 *                   description: Churn prediction metrics
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       data:
 *                         type: array
 *                         description: Metric data
 *       500:
 *         description: Error fetching churn prediction metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */

export const getChurnPrediction = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("getChurnPrediction");

    const subscriptionRepo = AppDataSource.getRepository(Subscription);

    // 🧭 View selector
    const view = (req.query.view as string) || "yearly"; // yearly | quarterly | monthly | weekly | 24hours
    const currentYear = new Date().getFullYear();

    // 🎯 Compare years
    const compareYears = req.query.compareYears
      ? (req.query.compareYears as string).split(",").map((y) => Number(y.trim()))
      : [currentYear - 1, currentYear];

    // 🧮 Helpers for start/end range
    const getStartOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year": return new Date(year, 0, 1, 0, 0, 0);
        case "month": return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        case "week": return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
        case "day": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        default: return new Date(year, 0, 1, 0, 0, 0);
      }
    };

    const getEndOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year": return new Date(year, 11, 31, 23, 59, 59);
        case "month": return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        case "week": return new Date();
        case "day": return new Date();
        default: return new Date(year, 11, 31, 23, 59, 59);
      }
    };

    // 🧾 Define SQL date grouping expressions
    let dateLabel = "MONTHNAME(sub.updatedAt)";
    let groupExpr = "MONTH(sub.updatedAt)";
    let startDate = getStartOf("year", currentYear);
    let endDate = getEndOf("year", currentYear);

    switch (view.toLowerCase()) {
      case "yearly":
        dateLabel = "MONTHNAME(sub.updatedAt)";
        groupExpr = "MONTH(sub.updatedAt)";
        startDate = getStartOf("year", currentYear);
        endDate = getEndOf("year", currentYear);
        break;

      case "quarterly":
        dateLabel = "CONCAT('Q', QUARTER(sub.updatedAt))";
        groupExpr = "QUARTER(sub.updatedAt)";
        startDate = getStartOf("year", currentYear);
        endDate = getEndOf("year", currentYear);
        break;

      case "monthly":
        dateLabel = "DAY(sub.updatedAt)";
        groupExpr = "DAY(sub.updatedAt)";
        startDate = getStartOf("month");
        endDate = getEndOf("month");
        break;

      case "weekly":
        dateLabel = "DAYNAME(sub.updatedAt)";
        groupExpr = "DAYOFWEEK(sub.updatedAt)";
        startDate = getStartOf("week");
        endDate = getEndOf("week");
        break;

      case "24hours":
        dateLabel = "HOUR(sub.updatedAt)";
        groupExpr = "HOUR(sub.updatedAt)";
        startDate = getStartOf("day");
        endDate = getEndOf("day");
        break;
    }

    // 🧮 Compute churn datasets per year
    const datasets: Record<number, { label: string; data: { x: string; y: number }[] }> = {};

    for (const year of compareYears) {
      const start = getStartOf("year", year);
      const end = getEndOf("year", year);

      const totalData = await subscriptionRepo
        .createQueryBuilder("sub")
        .select(`${dateLabel}`, "label")
        .addSelect("COUNT(DISTINCT sub.customerId)", "totalCustomers")
        .where("sub.isDelete = false")
        .andWhere("YEAR(sub.createdAt) = :year", { year })
        .andWhere("sub.createdAt BETWEEN :start AND :end", { start, end })
        .groupBy(groupExpr)
        .orderBy(groupExpr, "ASC")
        .getRawMany();

      const churnedData = await subscriptionRepo
        .createQueryBuilder("sub")
        .select(`${dateLabel}`, "label")
        .addSelect("COUNT(DISTINCT sub.customerId)", "churnedCustomers")
        .where("sub.isDelete = true")
        .andWhere("YEAR(sub.updatedAt) = :year", { year })
        .andWhere("sub.updatedAt BETWEEN :start AND :end", { start, end })
        .groupBy(groupExpr)
        .orderBy(groupExpr, "ASC")
        .getRawMany();

      // Merge totals + churned to calculate % per group
      const merged: { x: string; y: number }[] = [];
      for (const t of totalData) {
        const churnMatch = churnedData.find((c) => c.label === t.label);
        const churnRate = t.totalCustomers
          ? ((Number(churnMatch?.churnedCustomers || 0) / Number(t.totalCustomers)) * 100)
          : 0;
        merged.push({ x: t.label, y: Number(churnRate.toFixed(2)) });
      }

      datasets[year] = { label: year.toString(), data: merged };
    }

    // 🧩 Calculate overall churn growth between last two years
    const latestYear = Math.max(...compareYears);
    const prevYear = latestYear - 1;
    const avgCurrent =
      datasets[latestYear]?.data.reduce((s, d) => s + d.y, 0) /
      (datasets[latestYear]?.data.length || 1);
    const avgPrev =
      datasets[prevYear]?.data.reduce((s, d) => s + d.y, 0) /
      (datasets[prevYear]?.data.length || 1);

    const growth = avgPrev ? ((avgCurrent - avgPrev) / avgPrev) * 100 : 0;

    // ✅ Response
    return res.status(200).json({
      view,
      totalYears: compareYears,
      growthPercentage: Number(growth.toFixed(2)),
      datasets,
    });
  } catch (error) {
    console.error("Error in getChurnPrediction:", error);
    return res.status(500).json({
      message: "Error fetching churn prediction",
      error: error instanceof Error ? error.message : error,
    });
  }
};



/**
 * @swagger
 * /api/pre-signup-metrics/funnel-conversion:
 *   get:
 *     summary: Get funnel conversion metrics
 *     description: Returns the funnel conversion metrics for the current and previous period. You can filter the results by month, year, or quarter using the `view` query parameter.
 *     tags:
 *       - Pre-Signup Metrics
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [this_month, last_month, week, year, quarter]
 *           default: this_month
 *         description: |
 *           Filter the metrics by period:
 *             - `this_month`: Current month (default)
 *             - `last_month`: Previous month
 *             - `week`: Current week
 *             - `year`: Current year
 *             - `quarter`: Current quarter
 *     responses:
 *       200:
 *         description: Funnel conversion metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 growthPercentage:
 *                   type: number
 *                   description: Growth percentage
 *                 stages:
 *                   type: array
 *                   description: Funnel conversion metrics
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Metric label
 *                       value:
 *                         type: number
 *                         description: Metric value
 *       500:
 *         description: Error fetching funnel conversion metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getFunnelConversion = async (req: Request, res: Response): Promise<any> => {
  try {

  
    const view = (req.query.view as string) || "this_month"; // this_month | last_month | week | 24hours
    const now = new Date();

    // 🧭 Dynamic date ranges
    const getRange = (view: string) => {
      const start = new Date();
      const end = new Date();
      let prevStart, prevEnd;

      switch (view.toLowerCase()) {
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "last_month":
          start.setMonth(now.getMonth() - 1, 1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth(), 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
          break;

        case "week":
          const today = now.getDay();
          start.setDate(now.getDate() - today);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 7);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 7);
          prevEnd = new Date(start);
          prevEnd.setDate(start.getDate());
          break;

        case "24hours":
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          prevStart = new Date(start);
          prevStart.setDate(start.getDate() - 1);
          prevEnd = new Date(end);
          prevEnd.setDate(end.getDate() - 1);
          break;

        default:
          start.setDate(1);
          end.setMonth(now.getMonth() + 1, 0);
          prevStart = new Date(start);
          prevStart.setMonth(start.getMonth() - 1);
          prevEnd = new Date(end);
          prevEnd.setMonth(end.getMonth() - 1);
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    // 🧮 Pre-Signup Stage
    const preSignupCount = await metricRepo
      .createQueryBuilder("m")
      .select("SUM(m.value)", "count")
      .where("m.category = :category", { category: "pre_signup" })
      .andWhere("m.date BETWEEN :start AND :end", { start, end })
      .getRawOne();

    // 🧮 Signup Abandonment Stage
    const signupAbandonCount = await metricRepo
      .createQueryBuilder("m")
      .select("SUM(m.value)", "count")
      .where("m.category = :category", { category: "signup_abandonment" })
      .andWhere("m.date BETWEEN :start AND :end", { start, end })
      .getRawOne();

    // 🧮 Activation Stage
    const activationCount = await metricRepo
      .createQueryBuilder("m")
      .select("SUM(m.value)", "count")
      .where("m.category = :category", { category: "activation" })
      .andWhere("m.date BETWEEN :start AND :end", { start, end })
      .getRawOne();

    // 🧮 Retention Stage (Active subscriptions)
    const retentionCount = await subscriptionRepo
      .createQueryBuilder("sub")
      .select("COUNT(DISTINCT sub.customerId)", "count")
      .where("sub.isDelete = false")
      .andWhere("sub.createdAt BETWEEN :start AND :end", { start, end })
      .getRawOne();

    // 🕓 Previous period (for growth calculation)
    const prevRetentionCount = await subscriptionRepo
      .createQueryBuilder("sub")
      .select("COUNT(DISTINCT sub.customerId)", "count")
      .where("sub.isDelete = false")
      .andWhere("sub.createdAt BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
      .getRawOne();

    // 🧩 Normalize numeric values
    const preSignup = Number(preSignupCount?.count || 0);
    const signupAbandonment = Number(signupAbandonCount?.count || 0);
    const activation = Number(activationCount?.count || 0);
    const retention = Number(retentionCount?.count || 0);

    // ✅ Avoid division by zero
    const safeDivide = (a: number, b: number): number => (b === 0 ? 0 : (a / b) * 100);

    // 🧮 Conversion Percentages
    const preSignupPct = 100;
    const signupAbandonPct = safeDivide(signupAbandonment, preSignup);
    const activationPct = safeDivide(activation, preSignup);
    const retentionPct = safeDivide(retention, preSignup);

    // 🧾 Growth Calculation
    const prevRetention = Number(prevRetentionCount?.count || 0);
    const growthPercentage = prevRetention
      ? ((retention - prevRetention) / prevRetention) * 100
      : 0;

    // ✅ Response
    return res.status(200).json({
      view,
      stages: [
        { label: "Pre-Signup", value: Number(preSignupPct.toFixed(2)) },
        { label: "Signup Abandonment", value: Number(signupAbandonPct.toFixed(2)) },
        { label: "Activation", value: Number(activationPct.toFixed(2)) },
        { label: "Retention", value: Number(retentionPct.toFixed(2)) },
      ],
      growthPercentage: Number(growthPercentage.toFixed(2)),
    });
  } catch (error) {
    console.error("Error in getFunnelConversion:", error);
    return res.status(500).json({
      message: "Error fetching funnel conversion data",
      error: error instanceof Error ? error.message : error,
    });
  }
};


/**
 * @swagger
 * /api/pre-signup-metrics/funnel-conversion:
 *   post:
 *     tags:
 *       - Pre-Signup Metrics
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - metricType
 *               - value
 *               - date
 *               - source
 *             properties:
 *               category:
 *                 type: string
 *                 description: Metric category (e.g. "pre_signup", "signup_abandonment", etc.)
 *               metricType:
 *                 type: string
 *                 description: Metric type (e.g. "anonymous_visitors", "lead_magnet_engagers", etc.)
 *               value:
 *                 type: number
 *                 description: Numeric value for the metric
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO date string for the metric
 *               source:
 *                 type: string
 *                 description: Source of the metric (e.g. "homepage", "landing", etc.)
 *               metadata:
 *                 type: object
 *                 description: Optional metadata for the metric
 *     responses:
 *       201:
 *         description: Funnel metric created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       500:
 *         description: Error creating funnel metric
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *     summary: Create a new funnel metric
 *     description: Creates a new funnel metric for the given category and metric type.
 */
export const createFunnelMetric = async (req: Request, res: Response): Promise<any> => {
  try {
    // 🧾 Extract and validate input
    const {
      category,
      metricType,
      value,
      date,
      source,
      metadata,
    } = req.body;

    if (!category || !metricType) {
      return res.status(400).json({
        message: "Missing required fields: category and metricType are required.",
      });
    }

    // 🧭 Ensure value and date are properly set
    const metricValue = typeof value === "number" ? value : 0;
    const metricDate = date ? new Date(date) : new Date();

    // 🧮 Optional: Prevent duplicate for same date + metricType
    const existing = await metricRepo.findOne({
      where: {
        category,
        metricType,
        date: metricDate,
        isDelete: false,
      },
    });

    if (existing) {
      // If record exists, update the existing value instead of inserting
      existing.value += metricValue;
      existing.updatedAt = new Date();
      existing.source = source || existing.source;
      existing.metadata = metadata || existing.metadata;
      await metricRepo.save(existing);
      return res.status(200).json({
        message: "Metric updated successfully",
        data: existing,
      });
    }

    // 🧩 Create new record
    const newMetric = metricRepo.create({
      category,
      metricType,
      value: metricValue,
      date: metricDate,
      source: source || null,
      metadata: metadata || null,
      isDelete: false,
    });

    const saved = await metricRepo.save(newMetric);

    return res.status(201).json({
      message: "Metric created successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Error in createFunnelMetric:", error);
    return res.status(500).json({
      message: "Error creating funnel metric",
      error: error instanceof Error ? error.message : error,
    });
  }
};

