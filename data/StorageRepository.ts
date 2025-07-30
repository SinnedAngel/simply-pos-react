import { StoredImage } from '../domain/entities';
import { IStorageRepository } from '../domain/ports';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

// --- ADAPTER: Storage Repository ---
// This class implements the IStorageRepository port. It adapts our data source (Supabase Storage)
// to the interface required by our application's use cases.
export class StorageRepository implements IStorageRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async listImages(bucket: string): Promise<StoredImage[]> {
    const { data, error } = await this.supabase.storage.from(bucket).list('', {
        sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error("Error listing images from Supabase Storage:", error);
      throw new Error(`Error listing images: ${error.message}`);
    }

    if (!data) return [];
    
    // Filter out placeholder files that Supabase creates for empty folders
    const imageFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder');

    // The type for `file` is inferred from the `list` method's return signature.
    // This avoids a breaking change from Supabase where FileObject is no longer exported.
    return imageFiles.map((file) => ({
      name: file.name,
      url: this.getPublicUrl(bucket, file.name),
    }));
  }

  async uploadImage(bucket: string, file: File): Promise<StoredImage> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading image to Supabase Storage:", error);
      throw new Error(`Error uploading image: ${error.message}`);
    }

    return {
      name: data.path,
      url: this.getPublicUrl(bucket, data.path),
    };
  }

  async deleteImage(bucket: string, imageName: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([imageName]);
    
    if (error) {
      console.error("Error deleting image from Supabase Storage:", error);
      throw new Error(`Error deleting image: ${error.message}`);
    }
  }
}
