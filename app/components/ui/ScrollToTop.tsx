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
            className={`fixed bottom-[100px] right-4 sm:bottom-8 sm:right-8 z-40 group transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
            }`}
            aria-label="Scroll to top"
            title="เลื่อนขึ้นบนสุด"
        >
            {/* Pulsating glow ring behind */}
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-xl animate-pulse group-hover:bg-cyan-400/50 transition-colors duration-300" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-md animate-pulse" style={{ animationDuration: "2s" }} />

            {/* Main button */}
            <div className="relative p-3 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5),0_0_40px_rgba(6,182,212,0.2)] border border-white/25 backdrop-blur-md hover:shadow-[0_0_30px_rgba(6,182,212,0.7),0_0_60px_rgba(6,182,212,0.3)] hover:scale-110 active:scale-95 transition-all duration-300">
                <ArrowUpIcon size={22} />
            </div>
        </button>
    );
}
