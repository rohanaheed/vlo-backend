import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { PreSignupMatric } from "../entity/PreSignupMatric";
import { Subscription } from "../entity/Subscription";
import { Package } from "../entity/Package";

const metricRepo = AppDataSource.getRepository(PreSignupMatric);
const subscriptionRepo = AppDataSource.getRepository(Subscription);

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
    // View Selection
    const view = (req.query.view as string) || "this_month";
    const metricRepo = AppDataSource.getRepository(PreSignupMatric);

    const getRange = (view: string) => {
      const now = new Date();
      const start = new Date(); // Start of current period
      const end = new Date();   // End of current period
      const prevStart = new Date(); // Start of comparison period
      const prevEnd = new Date();   // End of comparison period

      switch (view) {
        case "last_month":
          // Current: Full Previous Month (e.g., Nov 1 - Nov 30)
          start.setDate(1);
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);

          end.setDate(0); // Last day of last month
          end.setHours(23, 59, 59, 999);

          // Previous: Full Month Before That (e.g., Oct 1 - Oct 31)
          prevStart.setDate(1);
          prevStart.setMonth(now.getMonth() - 2);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setDate(0); // Last day of 2 months ago
          prevEnd.setMonth(now.getMonth() - 1); // Fix month pointer
          prevEnd.setHours(23, 59, 59, 999);
          break;

        case "week":
          // Current: Start of this week (Sunday) to NOW
          const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
          start.setDate(now.getDate() - dayOfWeek);
          start.setHours(0, 0, 0, 0);
          
          end.setTime(now.getTime()); // Up to this exact moment

          // Previous: Start of last week to Same Time last week
          prevStart.setDate(start.getDate() - 7);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setDate(end.getDate() - 7);
          prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          break;

        case "this_month":
        default:
          // Current: 1st of month to NOW (e.g., Dec 1 - Dec 19)
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          
          end.setTime(now.getTime()); // Up to this exact moment

          // Previous: 1st of last month to Same Date last month (e.g., Nov 1 - Nov 19)
          prevStart.setMonth(now.getMonth() - 1, 1);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setMonth(now.getMonth() - 1, now.getDate());
          prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          break;
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const targetMetrics = [
      "anonymous_visitors",
      "lead_magnet_engagers",
      "pricing_page_bouncers"
    ];

    const [currentMetrics, previousMetrics] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.date BETWEEN :start AND :end", { start, end })
        .andWhere("m.category = :cat", { cat: "pre_signup" }) 
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany(),
        
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .andWhere("m.category = :cat", { cat: "pre_signup" })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    const getValue = (arr: any[], type: string) => {
      const row = arr.find(m => m.metricType === type);
      return row ? Number(row.value) : 0;
    };

    const currentStats = {
      anon: getValue(currentMetrics, "anonymous_visitors"),
      magnet: getValue(currentMetrics, "lead_magnet_engagers"),
      bounce: getValue(currentMetrics, "pricing_page_bouncers"),
    };

    const prevStats = {
      anon: getValue(previousMetrics, "anonymous_visitors"),
      magnet: getValue(previousMetrics, "lead_magnet_engagers"),
      bounce: getValue(previousMetrics, "pricing_page_bouncers"),
    };

    const totalCurrent = currentStats.anon + currentStats.magnet + currentStats.bounce;
    const totalPrevious = prevStats.anon + prevStats.magnet + prevStats.bounce;

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    return res.status(200).json({
      growthPercentage: Number(growthPercentage.toFixed(0)), 
      stats: [
        { label: "Anonymous Visitors", value: currentStats.anon },
        { label: "Lead Magnet Engagers", value: currentStats.magnet },
        { label: "Pricing Page Bouncers", value: currentStats.bounce },
      ],
    });

  } catch (error) {
    console.error("Error in getPreSignupMetrics:", error);
    return res.status(500).json({ message: "Internal server error" });
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
    const view = (req.query.view as string) || "this_month";
    const metricRepo = AppDataSource.getRepository(PreSignupMatric);

    const targetMetrics = [
      "form_abandoners",
      "oauth_dropoffs",
      "verification_ghosts"
    ];

    const getRange = (view: string) => {
      const now = new Date();
      const start = new Date();
      const end = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();

      if (view === "last_month") {
        // Current: Full Previous Month
        start.setDate(1);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0); 
        end.setHours(23, 59, 59, 999);

        // Previous: Full Month Before That
        prevStart.setDate(1);
        prevStart.setMonth(now.getMonth() - 2);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(0);
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setHours(23, 59, 59, 999);

      } else if (view === "week") {
        // Current: Start of Week (Sun)
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Week
        prevStart.setDate(start.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(end.getDate() - 7);
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      } else {
        // Default: "this_month"
        // Current: Start of Month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Month 
        prevStart.setMonth(now.getMonth() - 1);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setDate(now.getDate());
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const [currentMetrics, previousMetrics] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany(),
      
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    const formAbandoners = getValue(currentMetrics, "form_abandoners");
    const oauthDropoffs = getValue(currentMetrics, "oauth_dropoffs");
    const verificationGhosts = getValue(currentMetrics, "verification_ghosts");

    const totalCurrent = formAbandoners + oauthDropoffs + verificationGhosts;
    
    const prevForm = getValue(previousMetrics, "form_abandoners");
    const prevOauth = getValue(previousMetrics, "oauth_dropoffs");
    const prevVerify = getValue(previousMetrics, "verification_ghosts");
    const totalPrevious = prevForm + prevOauth + prevVerify;

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    return res.status(200).json({
      growthPercentage: Math.round(growthPercentage),
      stats: [
        { label: "Form Abandoners", value: formAbandoners },
        { label: "OAuth Drop-offs", value: oauthDropoffs },
        { label: "Verification Ghosts", value: verificationGhosts },
      ],
    });

  } catch (error) {
    console.error("Error in getSignupAbandonmentMetrics:", error);
    return res.status(500).json({ message: "Internal server error" });
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
    const view = (req.query.view as string) || "this_month";
    const metricRepo = AppDataSource.getRepository(PreSignupMatric);

    const targetMetrics = [
      "feature_explorers",
      "integration_stuck",
      "team_invite_ghosts"
    ];

    const getRange = (view: string) => {
      const now = new Date();
      const start = new Date();
      const end = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();

      if (view === "last_month") {
        // Current: Full Previous Month
        start.setDate(1);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0); 
        end.setHours(23, 59, 59, 999);

        // Previous: Full Month Before That
        prevStart.setDate(1);
        prevStart.setMonth(now.getMonth() - 2);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(0);
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setHours(23, 59, 59, 999);

      } else if (view === "week") {
        // Current: Start of Week (Sun) 
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Week
        prevStart.setDate(start.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(end.getDate() - 7);
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      } else {
        // Default: "this_month"
        // Current: Start of Month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Month 
        prevStart.setMonth(now.getMonth() - 1);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setDate(now.getDate());
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const [currentMetrics, previousMetrics] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "activation" }) // Filter by Activation
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany(),
      
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "activation" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    const featureExplorers = getValue(currentMetrics, "feature_explorers");
    const integrationStuck = getValue(currentMetrics, "integration_stuck");
    const teamInviteGhosts = getValue(currentMetrics, "team_invite_ghosts");

    const totalCurrent = featureExplorers + integrationStuck + teamInviteGhosts;
  
    const totalPrevious = 
      getValue(previousMetrics, "feature_explorers") +
      getValue(previousMetrics, "integration_stuck") +
      getValue(previousMetrics, "team_invite_ghosts");

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    return res.status(200).json({
      growthPercentage: Math.round(growthPercentage),
      stats: [
        { label: "Feature Explorers", value: featureExplorers },
        { label: "Integration Stuck", value: integrationStuck },
        { label: "Team Invite Ghosts", value: teamInviteGhosts },
      ],
    });

  } catch (error) {
    console.error("Error in getActivationMetrics:", error);
    return res.status(500).json({ message: "Internal server error" });
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
    const view = (req.query.view as string) || "this_month";
    const metricRepo = AppDataSource.getRepository(PreSignupMatric);

    const targetMetrics = [
      "discount_hunters",
      "silent_churn_risks",
      "renewal_draggers"
    ];

    const getRange = (view: string) => {
      const now = new Date();
      const start = new Date();
      const end = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();

      if (view === "last_month") {
        // Current: Full Previous Month
        start.setDate(1);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0); 
        end.setHours(23, 59, 59, 999);

        // Previous: Full Month Before That
        prevStart.setDate(1);
        prevStart.setMonth(now.getMonth() - 2);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(0);
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setHours(23, 59, 59, 999);

      } else if (view === "week") {
        // Current: Start of Week (Sun)
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Week
        prevStart.setDate(start.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(end.getDate() - 7);
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      } else {
        // Default: "this_month"
        // Current: Start of Month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        // Previous: Start of Last Month
        prevStart.setMonth(now.getMonth() - 1);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setDate(now.getDate());
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const [currentMetrics, previousMetrics] = await Promise.all([
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "retention_payment" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany(),
      
      metricRepo
        .createQueryBuilder("m")
        .select("m.metricType", "metricType")
        .addSelect("SUM(m.value)", "value")
        .where("m.category = :category", { category: "retention_payment" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .andWhere("m.metricType IN (:...types)", { types: targetMetrics })
        .groupBy("m.metricType")
        .getRawMany()
    ]);

    const getValue = (arr: any[], type: string): number =>
      Number(arr.find((m) => m.metricType === type)?.value || 0);

    const discountHunters = getValue(currentMetrics, "discount_hunters");
    const silentChurnRisks = getValue(currentMetrics, "silent_churn_risks");
    const renewalDraggers = getValue(currentMetrics, "renewal_draggers");
 
    const totalCurrent = discountHunters + silentChurnRisks + renewalDraggers;
    const totalPrevious = 
      getValue(previousMetrics, "discount_hunters") +
      getValue(previousMetrics, "silent_churn_risks") +
      getValue(previousMetrics, "renewal_draggers");

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    return res.status(200).json({
      growthPercentage: Math.round(growthPercentage),
      stats: [
        { label: "Discount Hunters", value: discountHunters },
        { label: "Silent Churn Risks", value: silentChurnRisks },
        { label: "Renewal Draggers", value: renewalDraggers },
      ],
    });

  } catch (error) {
    console.error("Error in getRetentionPaymentMetrics:", error);
    return res.status(500).json({ message: "Internal server error" });
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
    const view = (req.query.view as string) || "this_month";
    const subscriptionRepo = AppDataSource.getRepository(Subscription);

    const now = new Date();
    const getRange = (view: string) => {
      const start = new Date();
      const end = new Date();
      const prevStart = new Date();
      const prevEnd = new Date();

      if (view === "last_month") {
        start.setDate(1);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0); 
        end.setHours(23, 59, 59, 999);

        prevStart.setDate(1);
        prevStart.setMonth(now.getMonth() - 2);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(0);
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setHours(23, 59, 59, 999);
      } else if (view === "week") {
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        prevStart.setDate(start.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(end.getDate() - 7);
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
        // this_month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setTime(now.getTime());

        prevStart.setMonth(now.getMonth() - 1);
        prevStart.setDate(1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setMonth(now.getMonth() - 1);
        prevEnd.setDate(now.getDate());
        prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }
      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const currentData = await subscriptionRepo
      .createQueryBuilder("subscription")
      .leftJoin(Package, "package", "package.id = subscription.customerPackageId") 
      .select("package.name", "planName")
      .addSelect("COUNT(subscription.id)", "count")
      .where("subscription.createdAt BETWEEN :start AND :end", { start, end })
      .groupBy("package.name")
      .getRawMany();

    const previousData = await subscriptionRepo
      .createQueryBuilder("subscription")
      .leftJoin(Package, "package", "package.id = subscription.customerPackageId")
      .select("package.name", "planName")
      .addSelect("COUNT(subscription.id)", "count")
      .where("subscription.createdAt BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
      .groupBy("package.name")
      .getRawMany();

    // 4. Calculate Stats
    const targetPlans = ["Basic", "Standard", "Medium", "Large"];

    const getCount = (data: any[], planName: string) => {
      const row = data.find(d => d.planName === planName);
      return row ? Number(row.count) : 0;
    };

    let totalCurrent = 0;
    let totalPrevious = 0;

    targetPlans.forEach(plan => {
      totalCurrent += getCount(currentData, plan);
      totalPrevious += getCount(previousData, plan);
    });

    const plans = targetPlans.map(plan => {
      const currentCount = getCount(currentData, plan);
      const percentage = totalCurrent > 0 
        ? (currentCount / totalCurrent) * 100 
        : 0;

      return {
        label: plan,
        value: Math.round(percentage),
        count: currentCount
      };
    });

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    return res.status(200).json({
      totalNewSubscriptions: totalCurrent,
      growthPercentage: Math.round(growthPercentage),
      plans
    });

  } catch (error) {
    console.error("Error in getPlanDistribution:", error);
    return res.status(500).json({ message: "Internal server error" });
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

    const view = (req.query.view as string)?.toLowerCase() || "yearly";
    const now = new Date();
    const currentYear = now.getFullYear();

    const percentGrowth = (prev: number, curr: number) => {
      if (prev === 0 && curr === 0) return 0;
      if (prev === 0) return 100;
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    };

    const applyGrowth = (data: { x: string; y: number }[]) => {
      let prev = 0;
      return data.map(d => {
        const growth = percentGrowth(prev, d.y);
        prev = d.y;
        return { ...d, growth };
      });
    };

    const calculateCombinedGrowth = (data: any[]) => {
      const firstValue = data[0]?.y || 0;
      const lastValue = data[data.length - 1]?.y || 0;
      return percentGrowth(firstValue, lastValue);
    };

    if (view === "24hours" || view === "daily") {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      const hourlyMap = new Map<string, { total: number; churned: number }>();

      // Initialize all 24 hours
      for (let i = 23; i >= 0; i--) {
        const d = new Date(endDate.getTime() - i * 60 * 60 * 1000);
        const label = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true
        });
        hourlyMap.set(label, { total: 0, churned: 0 });
      }

      // Get total subscriptions created in last 24 hours
      const totalSubs = await subscriptionRepo
        .createQueryBuilder("sub")
        .select(["sub.createdAt"])
        .where("sub.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate })
        .getMany();

      for (const sub of totalSubs) {
        const hourLabel = new Date(sub.createdAt).toLocaleTimeString(
          "en-US",
          { hour: "numeric", hour12: true }
        );
        const entry = hourlyMap.get(hourLabel);
        if (entry) {
          entry.total += 1;
        }
      }

      // Get churned subscriptions in last 24 hours
      const churnedSubs = await subscriptionRepo
        .createQueryBuilder("sub")
        .select(["sub.updatedAt", "sub.isDelete"])
        .where("sub.isDelete = true")
        .andWhere("sub.updatedAt BETWEEN :start AND :end", { start: startDate, end: endDate })
        .getMany();

      for (const sub of churnedSubs) {
        const hourLabel = new Date(sub.updatedAt).toLocaleTimeString(
          "en-GB",
          { hour: "numeric", hour12: true }
        );
        const entry = hourlyMap.get(hourLabel);
        if (entry) {
          entry.churned += 1;
        }
      }

      const data = Array.from(hourlyMap.entries()).map(([x, counts]) => ({
        x,
        y: counts.total > 0 ? Number(((counts.churned / counts.total) * 100).toFixed(2)) : 0
      }));

      const dataWithGrowth = applyGrowth(data);
      const avgChurnRate24Hours = dataWithGrowth.reduce((s, d) => s + d.y, 0) / (dataWithGrowth.length || 1);

      return res.status(200).json({
        view,
        averageChurnRateLast24Hours: Number(avgChurnRate24Hours.toFixed(2)),
        data: dataWithGrowth
      });
    }

    if (view === "yearly") {
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const datasets: Record<number, any> = {};
      const avgChurnRates: number[] = [];

      for (const year of years) {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);

        const totalData = await subscriptionRepo
          .createQueryBuilder("sub")
          .select("MONTH(sub.createdAt)", "month")
          .addSelect("COUNT(DISTINCT sub.customerId)", "totalCustomers")
          .where("YEAR(sub.createdAt) = :year", { year })
          .andWhere("sub.createdAt BETWEEN :start AND :end", { start, end })
          .groupBy("MONTH(sub.createdAt)")
          .orderBy("MONTH(sub.createdAt)", "ASC")
          .getRawMany();

        const churnedData = await subscriptionRepo
          .createQueryBuilder("sub")
          .select("MONTH(sub.updatedAt)", "month")
          .addSelect("COUNT(DISTINCT sub.customerId)", "churnedCustomers")
          .where("sub.isDelete = true")
          .andWhere("YEAR(sub.updatedAt) = :year", { year })
          .andWhere("sub.updatedAt BETWEEN :start AND :end", { start, end })
          .groupBy("MONTH(sub.updatedAt)")
          .orderBy("MONTH(sub.updatedAt)", "ASC")
          .getRawMany();

        const series = months.map((m, i) => {
          const totalRecord = totalData.find(r => Number(r.month) === i + 1);
          const churnRecord = churnedData.find(r => Number(r.month) === i + 1);
          const totalCustomers = totalRecord ? Number(totalRecord.totalCustomers) : 0;
          const churnedCustomers = churnRecord ? Number(churnRecord.churnedCustomers) : 0;
          const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
          return { x: m, y: Number(churnRate.toFixed(2)) };
        });

        const data = applyGrowth(series);
        const avgChurnRate = data.reduce((s, d) => s + d.y, 0) / (data.length || 1);
        avgChurnRates.push(avgChurnRate);

        datasets[year] = {
          label: String(year),
          averageChurnRate: Number(avgChurnRate.toFixed(2)),
          data,
          growthPercentage: 0
        };
      }

      // Calculate year-over-year growth
      for (let i = 1; i < years.length; i++) {
        datasets[years[i]].growthPercentage = percentGrowth(
          avgChurnRates[i - 1],
          avgChurnRates[i]
        );
      }

      const overallAvgChurnRate = avgChurnRates.reduce((s, t) => s + t, 0) / (avgChurnRates.length || 1);
      const combinedGrowthThreeYears = percentGrowth(
        avgChurnRates[0],
        avgChurnRates[avgChurnRates.length - 1]
      );

      return res.status(200).json({
        view,
        averageChurnRateLastThreeYears: Number(overallAvgChurnRate.toFixed(2)),
        combinedGrowthPercentageThreeYears: combinedGrowthThreeYears,
        datasets
      });
    }

    let labels: string[] = [];
    let groupExpr = "";
    let dateLabel = "";
    let startDate!: Date;
    let endDate!: Date;
    let periodStartDate!: Date;
    let periodEndDate!: Date;

    const currentMonth = now.getMonth();

    // Calculate current week
    const currentWeekResult = await subscriptionRepo
      .createQueryBuilder("sub")
      .select("WEEK(:now)", "week")
      .setParameter("now", now)
      .getRawOne();
    const currentWeek = currentWeekResult?.week ? Number(currentWeekResult.week) : 1;

    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    switch (view) {
      case "monthly":
        labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        groupExpr = "MONTH(sub.createdAt)";
        dateLabel = "MONTH(sub.updatedAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        periodStartDate = new Date(currentYear, currentMonth, 1);
        periodEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        break;

      case "quarterly":
        labels = ["Q1","Q2","Q3","Q4"];
        groupExpr = "QUARTER(sub.createdAt)";
        dateLabel = "QUARTER(sub.updatedAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        periodStartDate = new Date(currentYear, (currentQuarter - 1) * 3, 1);
        periodEndDate = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);
        break;

      case "weekly":
        labels = Array.from({ length: 52 }, (_, i) => `W${i + 1}`);
        groupExpr = "WEEK(sub.createdAt)";
        dateLabel = "WEEK(sub.updatedAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        periodStartDate = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        periodStartDate.setHours(0, 0, 0, 0);
        periodEndDate = new Date(periodStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        periodEndDate.setHours(23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({ message: "Invalid view" });
    }

    // Get full year total subscriptions data
    const totalData = await subscriptionRepo
      .createQueryBuilder("sub")
      .select(groupExpr, "bucket")
      .addSelect("COUNT(DISTINCT sub.customerId)", "totalCustomers")
      .where("sub.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate })
      .groupBy(groupExpr)
      .orderBy(groupExpr, "ASC")
      .getRawMany();

    // Get full year churned subscriptions data
    const churnedData = await subscriptionRepo
      .createQueryBuilder("sub")
      .select(dateLabel, "bucket")
      .addSelect("COUNT(DISTINCT sub.customerId)", "churnedCustomers")
      .where("sub.isDelete = true")
      .andWhere("sub.updatedAt BETWEEN :start AND :end", { start: startDate, end: endDate })
      .groupBy(dateLabel)
      .orderBy(dateLabel, "ASC")
      .getRawMany();

    const series = labels.map((label, idx) => {
      const totalRecord = totalData.find(r => Number(r.bucket) === idx + 1);
      const churnRecord = churnedData.find(r => Number(r.bucket) === idx + 1);
      const totalCustomers = totalRecord ? Number(totalRecord.totalCustomers) : 0;
      const churnedCustomers = churnRecord ? Number(churnRecord.churnedCustomers) : 0;
      const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;
      return { x: label, y: Number(churnRate.toFixed(2)) };
    });

    const seriesWithGrowth = applyGrowth(series);
    const avgChurnRateCurrentYear = seriesWithGrowth.reduce((s, d) => s + d.y, 0) / (seriesWithGrowth.length || 1);
    const combinedGrowth = calculateCombinedGrowth(seriesWithGrowth);

    // Get current period churn rate
    const periodTotal = await subscriptionRepo
      .createQueryBuilder("sub")
      .select("COUNT(DISTINCT sub.customerId)", "count")
      .where("sub.createdAt BETWEEN :start AND :end", { start: periodStartDate, end: periodEndDate })
      .getRawOne();

    const periodChurned = await subscriptionRepo
      .createQueryBuilder("sub")
      .select("COUNT(DISTINCT sub.customerId)", "count")
      .where("sub.isDelete = true")
      .andWhere("sub.updatedAt BETWEEN :start AND :end", { start: periodStartDate, end: periodEndDate })
      .getRawOne();

    const periodTotalCount = Number(periodTotal?.count || 0);
    const periodChurnedCount = Number(periodChurned?.count || 0);
    const periodChurnRate = periodTotalCount > 0 ? (periodChurnedCount / periodTotalCount) * 100 : 0;

    let periodLabel = "";
    if (view === "monthly") {
      periodLabel = labels[currentMonth];
    } else if (view === "quarterly") {
      periodLabel = `Q${currentQuarter}`;
    } else if (view === "weekly") {
      periodLabel = `W${currentWeek}`;
    }

    return res.status(200).json({
      view,
      averageChurnRateCurrentYear: Number(avgChurnRateCurrentYear.toFixed(2)),
      combinedGrowthPercentageCurrentYear: combinedGrowth,
      currentPeriod: {
        label: periodLabel,
        churnRate: Number(periodChurnRate.toFixed(2))
      },
      data: seriesWithGrowth,
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
    const view = (req.query.view as string) || "this_month";
    const now = new Date();

    const getRange = (view: string) => {
      const start = new Date();
      const end = new Date(); 
      const prevStart = new Date();
      const prevEnd = new Date();

      switch (view) {
        case "last_month":
          start.setDate(1);
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);

          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          prevStart.setDate(1);
          prevStart.setMonth(now.getMonth() - 2);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setDate(0);
          prevEnd.setMonth(now.getMonth() - 1);
          prevEnd.setHours(23, 59, 59, 999);
          break;

        case "week":
          const dayOfWeek = now.getDay(); 
          start.setDate(now.getDate() - dayOfWeek);
          start.setHours(0, 0, 0, 0);

          end.setTime(now.getTime());

          prevStart.setDate(start.getDate() - 7);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setDate(end.getDate() - 7);
          prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          break;

        case "this_month":
        default:
          start.setDate(1);
          start.setHours(0, 0, 0, 0);

          end.setTime(now.getTime());

          prevStart.setMonth(now.getMonth() - 1, 1);
          prevStart.setHours(0, 0, 0, 0);

          prevEnd.setMonth(now.getMonth() - 1, now.getDate());
          prevEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          break;
      }

      return { start, end, prevStart, prevEnd };
    };

    const { start, end, prevStart, prevEnd } = getRange(view);

    const [preSignupCount, signupAbandonCount, activationCount, retentionCount] = await Promise.all([
      // Pre-Signup Stage
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "pre_signup" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .getRawOne(),

      // Signup Abandonment Stage
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .getRawOne(),

      // Activation Stage
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "activation" })
        .andWhere("m.date BETWEEN :start AND :end", { start, end })
        .getRawOne(),

      // Retention Stage
      subscriptionRepo
        .createQueryBuilder("sub")
        .select("COUNT(DISTINCT sub.customerId)", "count")
        .where("sub.isDelete = false")
        .andWhere("sub.createdAt BETWEEN :start AND :end", { start, end })
        .getRawOne()
    ]);

    const [prevPreSignupCount, prevSignupAbandonCount, prevActivationCount, prevRetentionCount] = await Promise.all([
      // Previous Pre-Signup
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "pre_signup" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .getRawOne(),

      // Previous Signup Abandonment
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "signup_abandonment" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .getRawOne(),

      // Previous Activation
      metricRepo
        .createQueryBuilder("m")
        .select("SUM(m.value)", "count")
        .where("m.category = :category", { category: "activation" })
        .andWhere("m.date BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .getRawOne(),

      // Previous Retention
      subscriptionRepo
        .createQueryBuilder("sub")
        .select("COUNT(DISTINCT sub.customerId)", "count")
        .where("sub.isDelete = false")
        .andWhere("sub.createdAt BETWEEN :start AND :end", { start: prevStart, end: prevEnd })
        .getRawOne()
    ]);

    // Current period values
    const preSignup = Number(preSignupCount?.count || 0);
    const signupAbandonment = Number(signupAbandonCount?.count || 0);
    const activation = Number(activationCount?.count || 0);
    const retention = Number(retentionCount?.count || 0);

    // Previous period values
    const prevPreSignup = Number(prevPreSignupCount?.count || 0);
    const prevSignupAbandonment = Number(prevSignupAbandonCount?.count || 0);
    const prevActivation = Number(prevActivationCount?.count || 0);
    const prevRetention = Number(prevRetentionCount?.count || 0);

    // Calculate total current and previous for overall growth
    const totalCurrent = preSignup + signupAbandonment + activation + retention;
    const totalPrevious = prevPreSignup + prevSignupAbandonment + prevActivation + prevRetention;

    let growthPercentage = 0;
    if (totalPrevious > 0) {
      growthPercentage = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    } else if (totalCurrent > 0) {
      growthPercentage = 100;
    }

    // Calculate individual stage growth percentages
    const calculateStageGrowth = (current: number, previous: number): number => {
      if (previous === 0 && current === 0) return 0;
      if (previous === 0 && current > 0) return 100;
      return ((current - previous) / previous) * 100;
    };

    return res.status(200).json({
      view,
      growthPercentage: Math.round(growthPercentage),
      stages: [
        {
          label: "Pre-Signup",
          value: preSignup,
          percentage: totalCurrent > 0 ? Number(((preSignup / totalCurrent) * 100).toFixed(2)) : 0,
          growth: Number(calculateStageGrowth(preSignup, prevPreSignup).toFixed(2))
        },
        {
          label: "Signup Abandonment",
          value: signupAbandonment,
          percentage: totalCurrent > 0 ? Number(((signupAbandonment / totalCurrent) * 100).toFixed(2)) : 0,
          growth: Number(calculateStageGrowth(signupAbandonment, prevSignupAbandonment).toFixed(2))
        },
        {
          label: "Activation",
          value: activation,
          percentage: totalCurrent > 0 ? Number(((activation / totalCurrent) * 100).toFixed(2)) : 0,
          growth: Number(calculateStageGrowth(activation, prevActivation).toFixed(2))
        },
        {
          label: "Retention",
          value: retention,
          percentage: totalCurrent > 0 ? Number(((retention / totalCurrent) * 100).toFixed(2)) : 0,
          growth: Number(calculateStageGrowth(retention, prevRetention).toFixed(2))
        },
      ],
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

