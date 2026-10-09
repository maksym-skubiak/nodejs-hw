import createHttpError from 'http-errors';
import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  callback(createHttpError(400, 'Only images allowed'));
};

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});
