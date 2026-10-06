'use server';
import { Readable } from 'node:stream';
import cloudinary from './cloudinary';

// Hard deadline for the upload so a hung connection cannot stall the request
// handler that owns the checkout/product flow (MONEY-59).
const UPLOAD_TIMEOUT_MS = 30_000;

// Function to upload image to Cloudinary and return URL and public_id
export async function UploadImage(
  image: Blob,
  folder: string,
): Promise<{ secure_url: string; public_id: string }> {
  const filename = `${Date.now()}_${(image as File).name.replaceAll(' ', '_')}`;
  const buffer = Buffer.from(await image.arrayBuffer());

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Cloudinary upload timed out after ${UPLOAD_TIMEOUT_MS}ms`));
      }, UPLOAD_TIMEOUT_MS);

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: filename },
        (error, result) => {
          clearTimeout(timer);
          if (error) {
            reject(error);
          } else {
            resolve({
              secure_url: result?.secure_url || '',
              public_id: result?.public_id || '',
            });
          }
        },
      );

      // Convert the buffer to a readable stream and pipe it into the Cloudinary upload stream
      Readable.from(buffer).pipe(uploadStream);
    },
  );

  return result; // Returns both secure_url and public_id
}
