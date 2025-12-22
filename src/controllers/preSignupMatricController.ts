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
      growthPercentage: Math.round(growthPercentage), // Returns an integer (e.g. 12)
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

