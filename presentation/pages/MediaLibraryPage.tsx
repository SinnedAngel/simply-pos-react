import React, { useRef, useState } from 'react';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { MediaUseCases } from '../../domain/use-cases/MediaUseCases';
import ImageCard from '../components/ImageCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { UploadIcon } from '../components/icons/UploadIcon';
import ConfirmModal from '../components/ConfirmModal';

interface MediaLibraryPageProps {
  useCases: MediaUseCases;
}

const MediaLibraryPage: React.FC<MediaLibraryPageProps> = ({ useCases }) => {
  const { images, isLoading, isUploading, error, uploadImages, deleteImage, refetch } = useMediaLibrary(useCases);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        await uploadImages(files);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
    // Reset file input to allow re-uploading the same file
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const confirmDelete = () => {
    if(imageToDelete) {
        deleteImage(imageToDelete);
        setImageToDelete(null);
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message="Loading Media Library..." />;
    }
    
    if (error && images.length === 0) {
        return (
             <div className="text-center py-8 text-red-400">
                <p>Error loading media library: {error}</p>
                <p className="mt-2">This might happen if the storage bucket is not set up. Please ensure you have run the latest database setup script.</p>
                <button onClick={refetch} className="mt-4 px-4 py-2 rounded-md bg-brand-primary hover:bg-brand-secondary">Try Again</button>
            </div>
        )
    }

    if (images.length === 0) {
      return (
        <div className="text-center py-16 border-2 border-dashed border-gray-600 rounded-lg">
          <h3 className="text-xl font-semibold text-text-primary">No Images Found</h3>
          <p className="text-text-secondary mt-2">Start by uploading your first product image.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {images.map(image => (
          <ImageCard key={image.name} image={image} onDelete={() => setImageToDelete(image.name)} />
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
        {imageToDelete && (
            <ConfirmModal 
                title="Delete Image"
                message="Are you sure you want to permanently delete this image? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setImageToDelete(null)}
            />
        )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Image Library</h2>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          hidden
          multiple
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5" />
              Upload Image
            </>
          )}
        </button>
      </div>
      {uploadError && <p className="text-red-500 text-sm text-center mb-4">{uploadError}</p>}
      {renderContent()}
    </div>
  );
};

export default MediaLibraryPage;
