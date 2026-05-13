import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useThemeMode } from "@/contexts/ThemeContext";

export default function ThemeToggle({ className = "", showText = false }: { className?: string; showText?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useThemeMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? resolvedTheme || theme : "system";
  const isDark = currentTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  const applyThemeImmediately = (targetTheme: "light" | "dark") => {
    try {
      window.localStorage.setItem("skillbridge-theme", targetTheme);
    } catch {
      // Ignore storage failures.
    }

    const root = document.documentElement;
    root.classList.toggle("dark", targetTheme === "dark");
    root.style.colorScheme = targetTheme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", targetTheme === "dark" ? "#111827" : "#f8fafc");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={showText ? "sm" : "icon"}
      className={className}
      onClick={() => {
        applyThemeImmediately(nextTheme);
        setTheme(nextTheme);
      }}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {showText && <span>{isDark ? "Light" : "Dark"}</span>}
    </Button>
  );
}
