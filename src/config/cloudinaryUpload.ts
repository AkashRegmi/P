import cloudinary from "../config/cloudinary";
import { UploadApiResponse } from "cloudinary";

// Cloudinary's SDK expects a stream, but multer memoryStorage gives us a
// Buffer, so we pipe the buffer into an upload_stream and wrap it in a Promise.
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder = "products"
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};
