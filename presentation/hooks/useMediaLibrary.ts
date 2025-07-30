
import { useState, useEffect, useCallback } from 'react';
import { StoredImage } from '../../domain/entities';
import { MediaUseCases } from '../../domain/use-cases';

const IMAGE_BUCKET = 'product-images';

export const useMediaLibrary = (useCases: MediaUseCases) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedImages = await useCases.listImages(IMAGE_BUCKET);
      setImages(fetchedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching images.');
    } finally {
      setIsLoading(false);
    }
  }, [useCases]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadImages = async (files: FileList): Promise<StoredImage[]> => {
    setIsUploading(true);
    setError(null);
    try {
      const uploadPromises = Array.from(files).map(file => useCases.uploadImage(IMAGE_BUCKET, file));
      const uploadedImages = await Promise.all(uploadPromises);
      await fetchImages(); // Refresh list to include the new images everywhere
      return uploadedImages;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown upload error occurred.';
      setError(msg);
      // Re-throw so the calling component can handle it (e.g., show an inline error)
      throw new Error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (imageName: string) => {
    try {
      // Optimistic deletion
      setImages(prev => prev.filter(img => img.name !== imageName));
      await useCases.deleteImage(IMAGE_BUCKET, imageName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image. Please refresh and try again.');
      // Re-fetch to get consistent state if delete fails
      await fetchImages();
    }
  };

  return { images, isLoading, isUploading, error, uploadImages, deleteImage, refetch: fetchImages };
};
