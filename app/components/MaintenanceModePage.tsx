"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { WrenchIcon, StarIcon, ZapIcon } from "./ui/Icons";
import { getSystemSettings } from "../lib/firebaseService";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 15;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const POLL_INTERVAL = 15000; // Check every 15 seconds

export default function MaintenanceModePage() {
    const { language } = useLanguage();
    const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
    const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
    const [food, setFood] = useState<Position>({ x: 10, y: 10 });
    const [direction, setDirection] = useState<Direction>("RIGHT");
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const directionRef = useRef<Direction>("RIGHT");
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    // Auto-refresh poll - check if maintenance mode is off
    useEffect(() => {
        const checkMaintenanceStatus = async () => {
            try {
                const settings = await getSystemSettings();
                if (!settings?.maintenanceMode) {
                    // Maintenance mode is off - refresh the page!
                    window.location.reload();
                }
            } catch (error) {
                console.error("Error checking maintenance status:", error);
            }
        };

        const interval = setInterval(checkMaintenanceStatus, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Generate random food position
    const generateFood = useCallback((currentSnake: Position[]): Position => {
        let newFood: Position;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }, []);

    // Start game
    const startGame = useCallback(() => {
        const initialSnake = [{ x: 7, y: 7 }];
        setSnake(initialSnake);
        setFood(generateFood(initialSnake));
        setDirection("RIGHT");
        directionRef.current = "RIGHT";
        setScore(0);
        setGameState("playing");
    }, [generateFood]);

    // Game loop
    useEffect(() => {
        if (gameState !== "playing") return;

        const moveSnake = () => {
            setSnake(prevSnake => {
                const head = prevSnake[0];
                const currentDirection = directionRef.current;

                let newHead: Position;
                switch (currentDirection) {
                    case "UP":
                        newHead = { x: head.x, y: head.y - 1 };
                        break;
                    case "DOWN":
                        newHead = { x: head.x, y: head.y + 1 };
                        break;
                    case "LEFT":
                        newHead = { x: head.x - 1, y: head.y };
                        break;
                    case "RIGHT":
                        newHead = { x: head.x + 1, y: head.y };
                        break;
                }

                // Check wall collision
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameState("gameover");
                    if (score > highScore) setHighScore(score);
                    return prevSnake;
                }

                // Check self collision
                if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameState("gameover");
                    if (score > highScore) setHighScore(score);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

                // Check food collision
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(prev => prev + 10);
                    setFood(generateFood(newSnake));
                    return newSnake; // Don't remove tail - snake grows
                }

                newSnake.pop(); // Remove tail
                return newSnake;
            });
        };

        gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameState, food, generateFood, score, highScore]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== "playing") return;

            const currentDir = directionRef.current;
            switch (e.key) {
                case "ArrowUp":
                    if (currentDir !== "DOWN") {
                        setDirection("UP");
                        directionRef.current = "UP";
                    }
                    break;
                case "ArrowDown":
                    if (currentDir !== "UP") {
                        setDirection("DOWN");
                        directionRef.current = "DOWN";
                    }
                    break;
                case "ArrowLeft":
                    if (currentDir !== "RIGHT") {
                        setDirection("LEFT");
                        directionRef.current = "LEFT";
                    }
                    break;
                case "ArrowRight":
                    if (currentDir !== "LEFT") {
                        setDirection("RIGHT");
                        directionRef.current = "RIGHT";
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameState]);

    // Touch controls
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || gameState !== "playing") return;

        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };

        const dx = touchEnd.x - touchStartRef.current.x;
        const dy = touchEnd.y - touchStartRef.current.y;

        const minSwipeDistance = 30;
        const currentDir = directionRef.current;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (Math.abs(dx) > minSwipeDistance) {
                if (dx > 0 && currentDir !== "LEFT") {
                    setDirection("RIGHT");
                    directionRef.current = "RIGHT";
                } else if (dx < 0 && currentDir !== "RIGHT") {
                    setDirection("LEFT");
                    directionRef.current = "LEFT";
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(dy) > minSwipeDistance) {
                if (dy > 0 && currentDir !== "UP") {
                    setDirection("DOWN");
                    directionRef.current = "DOWN";
                } else if (dy < 0 && currentDir !== "DOWN") {
                    setDirection("UP");
                    directionRef.current = "UP";
                }
            }
        }

        touchStartRef.current = null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary flex flex-col items-center justify-center p-4 overflow-hidden select-none">
            {/* Header */}
            <div className="text-center mb-6 relative z-10">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center animate-bounce shadow-lg shadow-accent-orange/30">
                        <WrenchIcon size={28} className="text-white" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    {language === 'th' ? '🔧 ระบบอยู่ระหว่างปรับปรุง' : '🔧 System Maintenance'}
                </h1>
                <p className="text-text-muted text-sm">
                    {language === 'th'
                        ? 'ในขณะที่รอ เล่นเกมส์งูกันเถอะ! 🐍'
                        : 'While you wait, play Snake! 🐍'}
                </p>
            </div>

            {/* Score */}
            <div className="flex gap-4 mb-4">
                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 flex items-center gap-2">
                    <StarIcon size={16} className="text-accent-yellow" />
                    <span className="text-white font-bold">{score}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-text-muted text-xs">Best:</span>
                    <span className="text-accent-green font-bold">{highScore}</span>
                </div>
            </div>

            {/* Game Board */}
            <div
                className="relative rounded-2xl border-2 border-white/20 bg-black/30 backdrop-blur-md overflow-hidden shadow-2xl"
                style={{
                    width: GRID_SIZE * CELL_SIZE,
                    height: GRID_SIZE * CELL_SIZE
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Grid Lines */}
                <div className="absolute inset-0 opacity-10">
                    {[...Array(GRID_SIZE)].map((_, i) => (
                        <div
                            key={`h-${i}`}
                            className="absolute w-full border-t border-white/20"
                            style={{ top: i * CELL_SIZE }}
                        />
                    ))}
                    {[...Array(GRID_SIZE)].map((_, i) => (
                        <div
                            key={`v-${i}`}
                            className="absolute h-full border-l border-white/20"
                            style={{ left: i * CELL_SIZE }}
                        />
                    ))}
                </div>

                {/* Food */}
                <div
                    className="absolute rounded-full bg-accent-red animate-pulse shadow-lg shadow-accent-red/50"
                    style={{
                        width: CELL_SIZE - 4,
                        height: CELL_SIZE - 4,
                        left: food.x * CELL_SIZE + 2,
                        top: food.y * CELL_SIZE + 2
                    }}
                />

                {/* Snake */}
                {snake.map((segment, index) => (
                    <div
                        key={index}
                        className={`absolute rounded-md transition-all duration-75 ${index === 0
                            ? 'bg-gradient-to-br from-accent-green to-accent-cyan shadow-lg shadow-accent-green/30'
                            : 'bg-accent-green/80'
                            }`}
                        style={{
                            width: CELL_SIZE - 2,
                            height: CELL_SIZE - 2,
                            left: segment.x * CELL_SIZE + 1,
                            top: segment.y * CELL_SIZE + 1
                        }}
                    />
                ))}

                {/* Start/Game Over Overlay */}
                {gameState !== "playing" && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <p className="text-lg font-bold text-white">
                            {gameState === "gameover"
                                ? (language === 'th' ? '💀 Game Over!' : '💀 Game Over!')
                                : (language === 'th' ? '🐍 Snake Game' : '🐍 Snake Game')}
                        </p>
                        {gameState === "gameover" && (
                            <p className="text-accent-yellow font-bold">
                                {language === 'th' ? 'คะแนน:' : 'Score:'} {score}
                            </p>
                        )}
                        <button
                            onClick={startGame}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan text-white font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-accent-green/30"
                        >
                            <ZapIcon size={20} />
                            {gameState === "gameover"
                                ? (language === 'th' ? 'เล่นอีกครั้ง' : 'Play Again')
                                : (language === 'th' ? 'เริ่มเกมส์' : 'Start Game')}
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Controls Info */}
            <p className="text-text-muted text-xs mt-4 text-center">
                {language === 'th'
                    ? '📱 Swipe เพื่อบังคับทิศทาง | ⌨️ ใช้ Arrow Keys'
                    : '📱 Swipe to control | ⌨️ Use Arrow Keys'}
            </p>

            {/* Footer Message */}
            <p className="text-text-muted text-xs mt-6 text-center max-w-sm">
                {language === 'th'
                    ? 'ทีมงานกำลังดำเนินการปรับปรุงระบบ กรุณารอสักครู่...'
                    : 'Our team is working on system improvements. Please wait...'}
            </p>
        </div>
    );
}
