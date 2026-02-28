import { Moon, Sun } from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700
      bg-white dark:bg-slate-800
      hover:shadow-md transition"
    >
      {isDark ? (
        <Sun className="text-yellow-400" size={18} />
      ) : (
        <Moon className="text-slate-700 dark:text-slate-300" size={18} />
      )}
    </button>
  );
}
