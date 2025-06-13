import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Box } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Box className="h-8 w-8 text-primary mr-3" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">UnifyDesk</span>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
