import { useState } from 'react';
import { CalendarDays, LayoutList, Zap, BookOpen } from 'lucide-react';
import CalendarView from './components/CalendarView';
import PracticeEditor from './components/PracticeEditor';
import MenuStockPage from './components/MenuStockPage';
import { isLocalMode } from './lib/supabase';

type View = 'calendar' | 'editor' | 'stock';

export default function App() {
  const [view, setView] = useState<View>('calendar');
  const [editorDate, setEditorDate] = useState<string | undefined>(undefined);

  function handleEditSession(date: string) {
    setEditorDate(date);
    setView('editor');
  }

  function handleBack() {
    setView('calendar');
  }

  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'calendar', label: 'カレンダー', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'editor', label: '練習作成', icon: <LayoutList className="w-4 h-4" /> },
    { key: 'stock', label: '練習ストック', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Navigation */}
      <header className="bg-[#0d2137] text-white shadow-lg z-20 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-black text-lg tracking-tight hidden sm:block">PracticeBoard</span>
            <span className="font-black text-base tracking-tight sm:hidden">PB</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === item.key
                    ? 'bg-white text-[#0d2137] shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="w-24 sm:w-32 hidden sm:flex items-center justify-end">
            <span className="text-xs text-white/40 font-medium">
              {isLocalMode ? 'ローカルモード' : 'コーチポータル'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden max-w-screen-2xl w-full mx-auto">
        {view === 'calendar' && <CalendarView onEditSession={handleEditSession} />}
        {view === 'editor' && <PracticeEditor initialDate={editorDate} onBack={handleBack} />}
        {view === 'stock' && <MenuStockPage />}
      </main>
    </div>
  );
}
