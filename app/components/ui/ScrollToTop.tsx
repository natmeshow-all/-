"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpIcon } from "./Icons";

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-[100px] right-4 sm:bottom-8 sm:right-8 z-40 p-3 rounded-full shadow-2xl bg-accent-blue/90 backdrop-blur-md text-white border border-white/20 transition-all duration-300 hover:bg-accent-blue hover:scale-110 active:scale-95 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
            }`}
            aria-label="Scroll to top"
        >
            <ArrowUpIcon size={24} />
        </button>
    );
}
