import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Note } from "../entity/Note";
import { noteSchema, updateNoteSchema } from "../utils/validators/inputValidator";

const noteRepo = AppDataSource.getRepository(Note);

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteInput'
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const createNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    
    // Validate request body
    const { error, value } = noteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Create note instance
    const note = new Note();
    note.title = value.title;
    note.content = value.content;
    note.customerId = value.customerId;
    note.type = value.type;
    note.isDelete = false;

    const savedNote = await noteRepo.save(note);

    return res.status(201).json({
      success: true,
      data: savedNote,
      message: 'Note created successfully'
    });

  } catch (error) {
    console.error('Error creating note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes (paginated)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by note type
 *     responses:
 *       200:
 *         description: List of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Note'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 */
export const getAllNotes = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const type = req.query.type as string;

    const whereConditions: any = { isDelete: false };
    
    if (customerId) {
      whereConditions.customerId = customerId;
    }
    
    if (type) {
      whereConditions.type = type;
    }

    const [notes, total] = await noteRepo.findAndCount({
      where: whereConditions,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: "DESC"
      }
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: notes,
      page,
      limit,
      totalPages,
      totalItems: total
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Get note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 */
export const getNoteById = async (req: Request, res: Response): Promise<any> => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID'
      });
    }

    const note = await noteRepo.findOne({
      where: { id: noteId, isDelete: false }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    return res.json({
      success: true,
      data: note
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteUpdateInput'
 *     responses:
 *       200:
 *         description: Note updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 *       400:
 *         description: Validation error
 */
export const updateNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID'
      });
    }

    // Validate request body
    const { error, value } = updateNoteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const note = await noteRepo.findOne({
      where: { id: noteId, isDelete: false }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Update note fields
    if (value.title !== undefined) note.title = value.title;
    if (value.content !== undefined) note.content = value.content;
    if (value.customerId !== undefined) note.customerId = value.customerId;
    if (value.type !== undefined) note.type = value.type;

    const updatedNote = await noteRepo.save(note);

    return res.json({
      success: true,
      data: updatedNote,
      message: 'Note updated successfully'
    });

  } catch (error) {
    console.error('Error updating note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete note by ID (soft delete)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
export const deleteNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note ID'
      });
    }

    const note = await noteRepo.findOne({
      where: { id: noteId, isDelete: false }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Soft delete
    note.isDelete = true;
    await noteRepo.save(note);

    return res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/notes/customer/{customerId}:
 *   get:
 *     summary: Get all notes for a specific customer
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by note type
 *     responses:
 *       200:
 *         description: List of notes for the customer
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 */
export const getNotesByCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const customerId = parseInt(req.params.customerId);
    const type = req.query.type as string;
    
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const whereConditions: any = { 
      customerId: customerId, 
      isDelete: false 
    };
    
    if (type) {
      whereConditions.type = type;
    }

    const notes = await noteRepo.find({
      where: whereConditions,
      order: {
        createdAt: "DESC"
      }
    });

    return res.json({
      success: true,
      data: notes
    });

  } catch (error) {
    console.error('Error fetching customer notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 