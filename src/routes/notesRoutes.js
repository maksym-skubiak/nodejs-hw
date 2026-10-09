import { Router } from 'express';
import { celebrate } from 'celebrate';

import {
  createNote,
  deleteNote,
  getAllNotes,
  getNoteById,
  updateNote,
} from '../controllers/notesController.js';
import {
  createNoteSchema,
  getAllNotesSchema,
  noteIdSchema,
  updateNoteSchema,
} from '../validations/notesValidation.js';

const notesRouter = Router();

notesRouter.get('/notes', celebrate(getAllNotesSchema), getAllNotes);
notesRouter.get('/notes/:noteId', celebrate(noteIdSchema), getNoteById);
notesRouter.post('/notes', celebrate(createNoteSchema), createNote);
notesRouter.patch('/notes/:noteId', celebrate(updateNoteSchema), updateNote);
notesRouter.delete('/notes/:noteId', celebrate(noteIdSchema), deleteNote);

export default notesRouter;
