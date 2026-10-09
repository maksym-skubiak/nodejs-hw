import createHttpError from 'http-errors';

import { Note } from '../models/note.js';

export const getAllNotes = async (req, res) => {
  const { page, perPage, tag, search } = req.query;
  const notesQuery = Note.find();
  const countNotesQuery = Note.countDocuments();

  notesQuery.where('userId').equals(req.user._id);
  countNotesQuery.where('userId').equals(req.user._id);

  if (tag) {
    notesQuery.where('tag').equals(tag);
    countNotesQuery.where('tag').equals(tag);
  }

  if (search) {
    const searchConditions = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];

    notesQuery.or(searchConditions);
    countNotesQuery.or(searchConditions);
  }

  const skip = (page - 1) * perPage;
  const [totalNotes, notes] = await Promise.all([
    countNotesQuery,
    notesQuery.skip(skip).limit(perPage),
  ]);
  const totalPages = Math.ceil(totalNotes / perPage);

  res.status(200).json({
    page,
    perPage,
    totalNotes,
    totalPages,
    notes,
  });
};

export const getNoteById = async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.noteId,
    userId: req.user._id,
  });

  if (!note) {
    throw createHttpError(404, 'Note not found');
  }

  res.status(200).json(note);
};

export const createNote = async (req, res) => {
  const note = await Note.create({ ...req.body, userId: req.user._id });

  res.status(201).json(note);
};

export const deleteNote = async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.noteId,
    userId: req.user._id,
  });

  if (!note) {
    throw createHttpError(404, 'Note not found');
  }

  res.status(200).json(note);
};

export const updateNote = async (req, res) => {
  const note = await Note.findOneAndUpdate(
    {
      _id: req.params.noteId,
      userId: req.user._id,
    },
    req.body,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  if (!note) {
    throw createHttpError(404, 'Note not found');
  }

  res.status(200).json(note);
};
