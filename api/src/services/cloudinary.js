import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { config } from "../config.js";

const supportedImageFormats = new Set([
  "jpeg",
  "png",
  "webp",
  "tiff",
  "gif",
  "heif",
]);

export class InvalidProductImageError extends Error {
  constructor(options) {
    super(
      "Upload a valid JPEG, PNG, WebP, GIF, TIFF, AVIF, or HEIF image (maximum 5 MB)",
      options,
    );
    this.name = "InvalidProductImageError";
  }
}

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

export async function uploadProductImage(buffer) {
  configureCloudinary();
  const webpBuffer = await convertProductImageToWebp(buffer);

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
      .end(webpBuffer);
  });
}

export async function convertProductImageToWebp(buffer) {
  try {
    const image = sharp(buffer, { failOn: "error" });
    const metadata = await image.metadata();
    if (!supportedImageFormats.has(metadata.format)) {
      throw new InvalidProductImageError();
    }

    return await image.rotate().webp({ quality: 85 }).toBuffer();
  } catch (error) {
    if (error instanceof InvalidProductImageError) throw error;
    throw new InvalidProductImageError({ cause: error });
  }
}

export async function deleteProductImage(publicId) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
