import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";

export class CloudinaryConfigurationError extends Error {
  constructor() {
    super("Cloudinary image storage is not configured");
    this.name = "CloudinaryConfigurationError";
  }
}

function configureCloudinary() {
  if (
    !config.cloudinaryCloudName ||
    !config.cloudinaryApiKey ||
    !config.cloudinaryApiSecret
  ) {
    throw new CloudinaryConfigurationError();
  }

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
}

export function uploadProductImage(buffer) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "yudhas-fashion/products",
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result?.secure_url || !result.public_id) {
            return reject(new Error("Cloudinary returned an incomplete upload"));
          }
          return resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      )
      .end(buffer);
  });
}

export async function deleteProductImage(publicId) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
