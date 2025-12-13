import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Currency } from '../entity/Currency';
import { currencySchema, updateCurrencySchema } from '../utils/validators/inputValidator';

const currencyRepo = AppDataSource.getRepository(Currency);

/**
 * @swagger
 * /api/currencies:
 *   post:
 *     summary: Create a new currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currencyCode
 *               - currencyName
 *               - currencySymbol
 *             properties:
 *               customerId:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               currencyCode:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 10
 *                 example: "USD"
 *               currencyName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "US Dollar"
 *               currencySymbol:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10
 *                 example: "$"
 *               exchangeRate:
 *                 type: number
 *                 minimum: 0
 *                 default: 1
 *               isCrypto:
 *                 type: boolean
 *                 default: false
 *               USDPrice:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *     responses:
 *       201:
 *         description: Currency created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       409:
 *         description: Currency with this code already exists
 *       500:
 *         description: Internal server error
 */
export const createCurrency = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate request body
    const { error, value } = currencySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if currency with same code already exists
    const existingCurrency = await currencyRepo.findOne({
      where: { currencyCode: value.currencyCode, isDelete: false }
    });

    if (existingCurrency) {
      return res.status(409).json({
        success: false,
        message: 'Currency with this code already exists'
      });
    }

    // Create currency instance
    const currency = new Currency();
    currency.country = value.country;
    currency.currencyCode = value.currencyCode;
    currency.currencyName = value.currencyName;
    currency.currencySymbol = value.currencySymbol;
    currency.exchangeRate = value.exchangeRate;
    currency.isCrypto = value.isCrypto;
    currency.USDPrice = value.USDPrice;
    currency.isDelete = false;

    const savedCurrency = await currencyRepo.save(currency);

    return res.status(201).json({
      success: true,
      data: savedCurrency,
      message: 'Currency created successfully'
    });

  } catch (error) {
    console.error('Error creating currency:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Get all currencies (paginated)
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by currency name or code
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: isCrypto
 *         schema:
 *           type: boolean
 *         description: Filter by crypto currency
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [currencyName, currencyCode, exchangeRate, createdAt]
 *           default: currencyName
 *         description: Sort by field
 *     responses:
 *       200:
 *         description: List of currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Currency'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllCurrencies = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const isCrypto = req.query.isCrypto as string;
    const order = (req.query.order as string) || 'asc';
    const sortBy = (req.query.sortBy as string) || 'currencyName';

    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = { isDelete: false };

    if (isCrypto !== undefined) {
      whereConditions.isCrypto = isCrypto === 'true';
    }

    // Build query
    let query = currencyRepo.createQueryBuilder('currency')
      .where(whereConditions);

    // Add search condition
    if (search) {
      query = query.andWhere(
        '(currency.currencyName ILIKE :search OR currency.currencyCode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['currencyName', 'currencyCode', 'exchangeRate', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'currencyName';
    query = query.orderBy(`currency.${sortField}`, order.toUpperCase() as 'ASC' | 'DESC');

    // Get total count
    const totalItems = await query.getCount();

    // Get paginated results
    const currencies = await query
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      data: currencies,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems
      }
    });

  } catch (error) {
    console.error('Error getting currencies:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies/{id}:
 *   get:
 *     summary: Get currency by ID
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     responses:
 *       200:
 *         description: Currency found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *       404:
 *         description: Currency not found
 *       500:
 *         description: Internal server error
 */
export const getCurrencyById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const currency = await currencyRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: currency
    });

  } catch (error) {
    console.error('Error getting currency:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies/{id}:
 *   put:
 *     summary: Update currency by ID
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: integer
 *                 minimum: 0
 *               currencyCode:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 10
 *               currencyName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               currencySymbol:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10
 *               exchangeRate:
 *                 type: number
 *                 minimum: 0
 *               isCrypto:
 *                 type: boolean
 *               USDPrice:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Currency updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Currency not found
 *       409:
 *         description: Currency with this code already exists
 *       500:
 *         description: Internal server error
 */
export const updateCurrency = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateCurrencySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if currency exists
    const existingCurrency = await currencyRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!existingCurrency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    // Check if currency code is being updated and if it already exists
    if (value.currencyCode && value.currencyCode !== existingCurrency.currencyCode) {
      const duplicateCurrency = await currencyRepo.findOne({
        where: { currencyCode: value.currencyCode, isDelete: false }
      });

      if (duplicateCurrency) {
        return res.status(409).json({
          success: false,
          message: 'Currency with this code already exists'
        });
      }
    }

    // Update currency
    Object.assign(existingCurrency, value);
    existingCurrency.updatedAt = new Date();

    const updatedCurrency = await currencyRepo.save(existingCurrency);

    return res.status(200).json({
      success: true,
      data: updatedCurrency,
      message: 'Currency updated successfully'
    });

  } catch (error) {
    console.error('Error updating currency:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies/{id}:
 *   delete:
 *     summary: Delete currency by ID (soft delete)
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     responses:
 *       200:
 *         description: Currency deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Currency not found
 *       500:
 *         description: Internal server error
 */
export const deleteCurrency = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const currency = await currencyRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    // Soft delete
    currency.isDelete = true;
    currency.updatedAt = new Date();
    await currencyRepo.save(currency);

    return res.status(200).json({
      success: true,
      message: 'Currency deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting currency:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies/all:
 *   get:
 *     summary: Get all currencies without pagination or filters
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Currency'
 *                 total:
 *                   type: integer
 *                   description: Total number of currencies
 *       500:
 *         description: Internal server error
 */
export const getAllCurrenciesSimple = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get all currencies without any filters or pagination
    const currencies = await currencyRepo.find({
      where: { isDelete: false },
    });

    return res.status(200).json({
      success: true,
      data: currencies,
      total: currencies.length
    });

  } catch (error) {
    console.error('Error getting all currencies:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/currencies/bulk:
 *   post:
 *     summary: Create multiple currencies
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currencies:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - currencyCode
 *                     - currencyName
 *                     - currencySymbol
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                       minimum: 0
 *                     currencyCode:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 10
 *                     currencyName:
 *                       type: string
 *                       minLength: 2
 *                       maxLength: 100
 *                     currencySymbol:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 10
 *                     exchangeRate:
 *                       type: number
 *                       minimum: 0
 *                     isCrypto:
 *                       type: boolean
 *                     USDPrice:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       201:
 *         description: Currencies created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const bulkCreateCurrencies = async (req: Request, res: Response): Promise<any> => {
  try {
    const { currencies } = req.body;

    if (!Array.isArray(currencies) || currencies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Currencies array is required and must not be empty'
      });
    }

    const createdCurrencies = [];
    const errors = [];

    for (let i = 0; i < currencies.length; i++) {
      try {
        const { error, value } = currencySchema.validate(currencies[i]);

        if (error) {
          errors.push({
            index: i,
            error: error.details[0].message
          });
          continue;
        }

        // Check if currency with same code already exists
        const existingCurrency = await currencyRepo.findOne({
          where: { currencyCode: value.currencyCode, isDelete: false }
        });

        if (existingCurrency) {
          errors.push({
            index: i,
            error: 'Currency with this code already exists'
          });
          continue;
        }

        // Create currency
        const currency = new Currency();
        currency.country = value.country
        currency.currencyCode = value.currencyCode;
        currency.currencyName = value.currencyName;
        currency.currencySymbol = value.currencySymbol;
        currency.exchangeRate = value.exchangeRate;
        currency.isCrypto = value.isCrypto;
        // currency.USDPrice = value.USDPrice;
        currency.isDelete = false;

        const savedCurrency = await currencyRepo.save(currency);
        createdCurrencies.push(savedCurrency);

      } catch (error) {
        errors.push({
          index: i,
          error: 'Failed to create currency'
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: createdCurrencies,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${createdCurrencies.length} currencies`
    });

  } catch (error) {
    console.error('Error bulk creating currencies:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
