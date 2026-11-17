import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
      title="Toggle theme"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
