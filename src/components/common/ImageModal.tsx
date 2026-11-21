import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  alt = "Image preview" 
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 z-10 p-2 text-white hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* Image Container */}
        <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl">
          <img
            src={imageUrl}
            alt={alt}
            crossOrigin={imageUrl && (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) ? undefined : "anonymous"}
            className="w-full h-auto max-h-[80vh] object-contain"
            onError={(e) => {
              if (imageUrl && (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:'))) return;
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
              target.alt = 'Image not found';
            }}
          />
        </div>

        {/* Image Info */}
        <div className="mt-2 text-center">
          <p className="text-white text-sm opacity-75">
            Click outside or press ESC to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
