
import React from 'react';
import { XIcon, MaximizeIcon } from './Icons';

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    altText?: string;
}

export default function Lightbox({ isOpen, onClose, imageSrc, altText = "Image" }: LightboxProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-[110]"
            >
                <XIcon size={32} />
            </button>
            <div className="relative w-full h-full max-w-7xl max-h-screen p-4 flex items-center justify-center pointer-events-none">
                <img
                    src={imageSrc}
                    alt={altText}
                    className="max-w-full max-h-full object-contain pointer-events-auto transform transition-transform duration-300"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                />
            </div>
        </div>
    );
}
