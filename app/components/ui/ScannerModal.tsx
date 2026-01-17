"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { XIcon, CameraIcon, RefreshCwIcon } from "./Icons";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { success, error: showError } = useToast();
    const [scannerLoaded, setScannerLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerId = "qrcode-region";

    useEffect(() => {
        if (isOpen) {
            const startScanner = async () => {
                try {
                    // Initialize the scanner
                    scannerRef.current = new Html5Qrcode(scannerId);
                    setScannerLoaded(true);

                    await scannerRef.current.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                        },
                        (decodedText: string) => {
                            // On success
                            console.log("Found QR Code:", decodedText);
                            handleScanResult(decodedText);
                        },
                        (errorMessage: string) => {
                            // On error (continuously scanning) - ignore common "no QR code" errors
                        }
                    );
                } catch (err: any) {
                    console.error("Camera error:", err);
                    setError(err?.message || "Could not access camera");
                }
            };

            startScanner();
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    console.log("Scanner stopped");
                    scannerRef.current = null;
                }).catch((err: any) => console.error("Error stopping scanner:", err));
            }
        };
    }, [isOpen]);

    const handleScanResult = (text: string) => {
        // Logic to parse the QR content
        // Example: https://aob.vercel.app/machines/123
        try {
            const url = new URL(text);
            if (url.hostname.includes("aob") || text.includes("/machines/") || text.includes("/parts/")) {
                router.push(url.pathname + url.search);
                onClose();
            } else {
                success("Scanned Content", text);
            }
        } catch (e) {
            // Not a URL, display or check ID patterns
            success("Scanned Content", text);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-bg-secondary rounded-2xl border border-border-light overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-border-light flex items-center justify-between bg-bg-tertiary/50">
                    <div className="flex items-center gap-2">
                        <CameraIcon className="text-primary" size={20} />
                        <h3 className="font-bold text-text-primary">QR Scanner</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <XIcon size={24} className="text-text-muted" />
                    </button>
                </div>

                {/* Scanner Region */}
                <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                    <div id={scannerId} className="w-full h-full"></div>

                    {!scannerLoaded && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <RefreshCwIcon className="text-primary animate-spin" size={32} />
                            <p className="text-sm text-text-muted">Initializing Camera...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-accent-red/20 flex items-center justify-center">
                                <XIcon className="text-accent-red" size={32} />
                            </div>
                            <div>
                                <h4 className="font-bold text-text-primary mb-1">Camera Access Denied</h4>
                                <p className="text-xs text-text-muted">{error}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-outline text-xs"
                            >
                                Try Again Later
                            </button>
                        </div>
                    )}

                    {/* Scanning Overlay */}
                    {scannerLoaded && !error && (
                        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                            <div className="w-full h-full border-2 border-primary/50 relative">
                                {/* Corner markers */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

                                {/* Scanning bar */}
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Instructions */}
                <div className="p-4 text-center">
                    <p className="text-xs text-text-muted">
                        Point your camera at a Machine or Part QR code to view details automatically.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Add these to local CSS or globals if scanner styling is needed
// .animate-scan-line { animation: scan 3s infinite ease-in-out; }
// @keyframes scan { 0%, 100% { top: 0%; } 50% { top: 100%; } }
