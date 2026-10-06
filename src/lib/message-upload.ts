import { UploadImage } from '@/cloudinary/upload-image';

export const MESSAGE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MESSAGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Shared, validated message-image upload (MONEY-49). Both the public upload
 * endpoint and `api/messages/create.ts` go through this so an unbounded inline
 * upload path can never bypass the MIME/size checks.
 */
export async function uploadMessageImage(
  file: File,
): Promise<{ imageUrl: string; imagePublicId: string } | { error: string }> {
  if (!(MESSAGE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
  }

  if (file.size > MESSAGE_IMAGE_MAX_BYTES) {
    return { error: 'Image must be under 5MB' };
  }

  const result = await UploadImage(file, 'messages');
  return { imageUrl: result.secure_url, imagePublicId: result.public_id };
}