import { NextFunction, Request, Response } from "express";
import multer from "multer";

const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_POSTER_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_POSTER_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_POSTER_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }

    callback(null, true);
  },
}).single("poster");

export const uploadEventPosterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        code: "POSTER_TOO_LARGE",
        message: "Poster image must be 5 MB or smaller.",
      });
    }

    if (error instanceof Error && error.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({
        success: false,
        code: "UNSUPPORTED_POSTER_TYPE",
        message: "Poster must be a JPG, PNG, or WebP image.",
      });
    }

    return res.status(400).json({
      success: false,
      code: "INVALID_POSTER_UPLOAD",
      message: "Poster image could not be uploaded.",
    });
  });
};
