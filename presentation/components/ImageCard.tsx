import React, { useState } from 'react';
import { StoredImage } from '../../domain/entities';
import { TrashIcon } from './icons/TrashIcon';
import { CopyIcon } from './icons/CopyIcon';

interface ImageCardProps {
  image: StoredImage;
  onDelete: (imageName: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onDelete }) => {
  const [copyText, setCopyText] = useState('Copy URL');

  const handleCopy = () => {
    navigator.clipboard.writeText(image.url);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy URL'), 2000);
  };

  return (
    <div className="bg-surface-card rounded-lg shadow-lg overflow-hidden group transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-accent/10 relative">
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="p-3">
        <p className="text-xs text-text-secondary truncate" title={image.name}>
          {image.name}
        </p>
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 text-xs px-2 py-1.5 rounded-md bg-surface-main hover:bg-gray-600 text-text-secondary font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            {copyText}
          </button>
          <button
            onClick={() => onDelete(image.name)}
            aria-label="Delete image"
            className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
