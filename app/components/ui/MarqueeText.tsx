"use client";

import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
    text: string;
    className?: string;
    children?: React.ReactNode;
}

export default function MarqueeText({ text, className = "", children }: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                // Check if the text width is greater than the container width
                setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [text, children]);

    return (
        <div 
            ref={containerRef} 
            className={`overflow-hidden relative flex items-center ${className}`}
        >
            <div
                ref={textRef}
                className={`whitespace-nowrap flex items-baseline gap-1.5 ${isOverflowing ? 'animate-marquee-text' : ''}`}
            >
                {/* Primary text */}
                <span>{text}</span>
                {children}
                
                {/* Duplicate text for seamless loop, only rendered if overflowing */}
                {isOverflowing && (
                    <>
                        <span className="inline-block w-8"></span>
                        <span>{text}</span>
                        {children}
                    </>
                )}
            </div>

            {/* Fade edges for smooth marquee effect when overflowing */}
            {isOverflowing && (
                <>
                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-bg-secondary to-transparent pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-bg-secondary to-transparent pointer-events-none" />
                </>
            )}
        </div>
    );
}
