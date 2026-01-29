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
    const { user, userProfile, hasRole } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            // Only hide if we scoll down significantly and not near the top
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY) {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    const displayName = userProfile?.displayName || userProfile?.nickname || user?.displayName || "User";

    return (
        <nav
            className={`mobile-nav transition-all duration-300 ${isVisible ? "translate-y-0" : "translate-y-full"}`}
        >
            <div className="mobile-nav-container flex items-center overflow-x-auto no-scrollbar w-full h-[56px]">
                <div className="flex items-center justify-between min-w-full px-2">
                    {navItems
                        .filter(item => !item.roles || hasRole(item.roles))
                        .map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center h-full min-w-[70px] gap-1 transition-colors ${isActive ? "text-white" : "text-text-muted hover:text-white/80"}`}
                                >
                                    <Icon size={20} className={isActive ? "text-white" : "text-text-muted"} />
                                    <span className={`text-[10px] font-bold whitespace-nowrap ${isActive ? "text-white" : "text-text-muted"}`}>
                                        {t(item.labelKey as any)}
                                    </span>
                                </Link>
                            );
                        })}

                    {/* Profile Link at the end */}
                    <Link
                        href="/users"
                        className={`flex flex-col items-center justify-center h-full min-w-[70px] gap-1 ${pathname === '/users' ? "text-white" : "text-text-muted"}`}
                    >
                        <div className={`w-6 h-6 rounded-full overflow-hidden border ${pathname === '/users' ? "border-white" : "border-transparent"}`}>
                            <img
                                src={user?.photoURL || "https://ui-avatars.com/api/?name=" + displayName}
                                alt="You"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="text-[10px] font-bold whitespace-nowrap">{t("navProfile")}</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

