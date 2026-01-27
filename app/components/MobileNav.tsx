import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import {
    HomeIcon,
    SettingsIcon,
    BoxIcon,
    WrenchIcon,
    CalendarIcon,
    ActivityIcon,
    CheckCircleIcon,
} from "./ui/Icons";

interface NavItem {
    href: string;
    labelKey: string;
    icon: React.FC<{ className?: string; size?: number }>;
    roles?: UserRole[];
}

const navItems: NavItem[] = [
    { href: "/", labelKey: "navDashboard", icon: HomeIcon },
    { href: "/machines", labelKey: "navMachines", icon: SettingsIcon },
    { href: "/parts", labelKey: "navParts", icon: BoxIcon },
    { href: "/maintenance", labelKey: "navMaintenance", icon: WrenchIcon },
    { href: "/schedule", labelKey: "navSchedule", icon: CalendarIcon },
    { href: "/predictive", labelKey: "navPredictive", icon: ActivityIcon, roles: ["supervisor", "admin"] },
    { href: "/audit", labelKey: "navAudit", icon: CheckCircleIcon, roles: ["supervisor", "admin"] },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { hasRole } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show when scrolling up or at the top
            if (currentScrollY < lastScrollY || currentScrollY < 50) {
                setIsVisible(true);
            }
            // Hide when scrolling down
            else if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setIsVisible(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    return (
        <>
            {/* SVG filter for gooey effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="gooey-filter">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                            result="gooey"
                        />
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <nav
                className={`mobile-nav lg:hidden transition-all duration-500 ease-out shadow-2xl shadow-black/50 ${isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-[calc(100%+2rem)] opacity-0"
                    }`}
            >
                {navItems
                    .filter(item => !item.roles || hasRole(item.roles))
                    .map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`mobile-nav-item transition-all duration-300 active:scale-90 ${isActive ? "active scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`}
                            >
                                <div className={`relative ${isActive ? "animate-bounce-subtle" : ""}`}>
                                    <Icon className={`mobile-nav-icon transition-colors duration-300 ${isActive ? "text-primary" : "text-text-muted"}`} size={20} />
                                    {isActive && <div className="absolute inset-0 bg-primary/20 blur-md rounded-full -z-10" />}
                                </div>
                                <span className={`text-[11px] mt-0.5 font-bold transition-colors duration-300 leading-none ${isActive ? "text-white" : "text-text-muted"}`}>
                                    {t(item.labelKey as any)}
                                </span>
                            </Link>
                        );
                    })}
            </nav>
        </>
    );
}
