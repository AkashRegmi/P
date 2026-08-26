import multer from "multer";

// Keep the file in memory as a Buffer so we can stream it straight to
// Cloudinary in the controller, without writing it to disk first.
const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Some clients (Postman on Windows, certain OS file pickers) send a
  // generic "application/octet-stream" mimetype instead of the real one,
  // so fall back to checking the file extension as well.
  const hasImageMimetype = file.mimetype.startsWith("image/");
  const hasImageExtension = ALLOWED_EXTENSIONS.test(file.originalname);

  if (hasImageMimetype || hasImageExtension) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});