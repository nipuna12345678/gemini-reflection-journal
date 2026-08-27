import React from 'react';
import {
  Sparkles,
  BookOpen,
  History,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentTab: 'editor' | 'history' | 'synthesis';
  setCurrentTab: (tab: 'editor' | 'history' | 'synthesis') => void;
  openSecurityModal: () => void;
  entriesCount: number;
  onNewEntry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openSecurityModal,
  entriesCount,
  onNewEntry,
}) => {
  const { user, signOutUser } = useAuth();

  const handleNewEntryClick = () => {
    if (onNewEntry) {
      onNewEntry();
    } else {
      setCurrentTab('editor');
    }
  };

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center text-stone-950 font-bold shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-100 tracking-tight text-lg">
                Gemini Reflections
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              AI Journaling with Isolated Cloud Firestore
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Prominent New Entry Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-header-prominent-new-entry"
            onClick={handleNewEntryClick}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-bold shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer"
            title="Start a fresh new journal reflection"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden xs:inline font-bold">+ New Entry</span>
            <span className="xs:hidden font-bold">New</span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
            <button
              id="tab-history"
              onClick={() => setCurrentTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                currentTab === 'history'
                  ? 'bg-stone-700 text-stone-100 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Journal History</span>
              <span className="sm:hidden">History</span>
              {entriesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700 text-stone-300 border border-stone-600">
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              id="tab-synthesis"
              onClick={() => setCurrentTab('synthesis')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                currentTab === 'synthesis'
                  ? 'bg-stone-700 text-stone-100 shadow-sm font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">AI Synthesis</span>
              <span className="sm:hidden">Synthesis</span>
            </button>
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Security Status Badge */}
          <button
            id="btn-security-rules"
            onClick={openSecurityModal}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/40 transition-colors"
            title="View Firestore Isolation & Security Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px]">Firestore: UID Isolated</span>
          </button>

          {/* User Profile info */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-700 text-stone-200 flex items-center justify-center text-xs font-semibold">
                  {user.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-stone-200 truncate max-w-[130px]">
                  {user.displayName || 'Reflective User'}
                </p>
                <p className="text-[10px] text-stone-400 truncate max-w-[130px]">
                  {user.email || 'Google Auth'}
                </p>
              </div>

              <button
                id="btn-sign-out"
                onClick={signOutUser}
                className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
