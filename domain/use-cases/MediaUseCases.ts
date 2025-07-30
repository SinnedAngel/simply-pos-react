import { IStorageRepository } from '../ports';
import { StoredImage } from '../entities';

// --- USE CASE: Managing Media ---
// This use case orchestrates all media-related logic, like listing, uploading, and deleting images.
export class MediaUseCases {
  constructor(private storageRepository: IStorageRepository) {}

  async listImages(bucket: string): Promise<StoredImage[]> {
    return await this.storageRepository.listImages(bucket);
  }

  async uploadImage(bucket: string, file: File): Promise<StoredImage> {
    // Basic validation
    if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Only images are allowed.');
    }
    // 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 5MB.');
    }
    return await this.storageRepository.uploadImage(bucket, file);
  }

  async deleteImage(bucket: string, imageName: string): Promise<void> {
    await this.storageRepository.deleteImage(bucket, imageName);
  }
}
