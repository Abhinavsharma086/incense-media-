import React, { useState, useEffect } from 'react';
import ImageModal from './ImageModal';

/**
 * ClickableImage Component
 * 
 * A resilient, reusable component that displays an image and opens it in a modal when clicked.
 * Includes auto-fallback subfolder probing across known backend uploads directories.
 */
interface ClickableImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  entityType?: string;
}

const CANDIDATE_FOLDERS = [
  'page-banner',
  'magazines',
  'blogs',
  'events',
  'slider',
  'awards',
  'services',
  'teams',
  'courses',
  'users',
  'testimonials',
  'masters',
  'clients',
];

const DEFAULT_FALLBACK = '/assets/img/banner-images/publications.jpg';

const ClickableImage: React.FC<ClickableImageProps> = ({
  src,
  alt = 'Image',
  className = '',
  fallbackSrc = DEFAULT_FALLBACK,
  entityType,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setFallbackIndex(0);
  }, [src, fallbackSrc]);

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleImageError = () => {
    // If empty or already on fallback, or data/blob URL, don't probe or overwrite
    if (!currentSrc || currentSrc === fallbackSrc) {
      return;
    }
    if (currentSrc.startsWith('blob:') || currentSrc.startsWith('data:')) {
      // Do NOT replace user's local blob/data preview with fallback
      return;
    }

    // Extract raw filename
    const clean = currentSrc.replace(/\\/g, '/');
    let filename = clean;
    if (clean.includes('/uploads/')) {
      const parts = clean.split('/uploads/');
      filename = parts[parts.length - 1];
    }
    const cleanFilename = filename.split('/').pop() || '';
    if (!cleanFilename || cleanFilename.includes('undefined') || cleanFilename.includes('null')) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    if (fallbackIndex === 0) {
      setFallbackIndex(1);
      setCurrentSrc(`https://api.incensemedia.in/uploads/${cleanFilename}`);
      return;
    }

    const folderIdx = fallbackIndex - 1;
    if (folderIdx < CANDIDATE_FOLDERS.length) {
      const nextFolder = CANDIDATE_FOLDERS[folderIdx];
      setFallbackIndex((prev) => prev + 1);
      setCurrentSrc(`https://api.incensemedia.in/uploads/${nextFolder}/${cleanFilename}`);
    } else {
      setCurrentSrc(fallbackSrc);
    }
  };

  const isBlobOrData = (src && (src.startsWith('blob:') || src.startsWith('data:'))) ||
    (currentSrc && (currentSrc.startsWith('blob:') || currentSrc.startsWith('data:')));

  if (isBlobOrData) {
    const displaySrc = (src && (src.startsWith('blob:') || src.startsWith('data:'))) ? src : currentSrc;
    return (
      <>
        <img
          src={displaySrc}
          alt={alt}
          className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
          onClick={handleImageClick}
        />
        <ImageModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          imageUrl={displaySrc}
          alt={alt}
        />
      </>
    );
  }

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        crossOrigin="anonymous"
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={handleImageClick}
        onError={handleImageError}
      />
      
      <ImageModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        imageUrl={currentSrc}
        alt={alt}
      />
    </>
  );
};

export default ClickableImage;
