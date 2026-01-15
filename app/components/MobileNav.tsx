import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../contexts/LanguageContext";
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
    labelKey: "navDashboard" | "navMachines" | "navParts" | "navMaintenance" | "navSchedule" | "navPredictive" | "navAudit";
    icon: React.FC<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
    { href: "/", labelKey: "navDashboard", icon: HomeIcon },
    { href: "/machines", labelKey: "navMachines", icon: SettingsIcon },
    { href: "/parts", labelKey: "navParts", icon: BoxIcon },
    { href: "/maintenance", labelKey: "navMaintenance", icon: WrenchIcon },
    { href: "/schedule", labelKey: "navSchedule", icon: CalendarIcon },
    { href: "/predictive", labelKey: "navPredictive", icon: ActivityIcon },
    { href: "/audit", labelKey: "navAudit", icon: CheckCircleIcon },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { t } = useLanguage();
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
                className={`mobile-nav lg:hidden transition-all duration-500 ease-out ${isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-[calc(100%+2rem)] opacity-0"
                    }`}
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`mobile-nav-item ${isActive ? "active" : ""}`}
                        >
                            <Icon className="mobile-nav-icon" size={20} />
                            <span>{t(item.labelKey)}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
