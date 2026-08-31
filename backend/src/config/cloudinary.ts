import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

const CLOUDINARY_FOLDER = "hackerearth-nmamit/events";

const getRequiredCloudinaryEnv = (key: string) => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required for Cloudinary uploads.`);
  }

  return value;
};

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: getRequiredCloudinaryEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: getRequiredCloudinaryEnv("CLOUDINARY_API_KEY"),
    api_secret: getRequiredCloudinaryEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
};

export const uploadEventPosterToCloudinary = (
  buffer: Buffer
): Promise<UploadApiResponse> => {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

export { CLOUDINARY_FOLDER };
