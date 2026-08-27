import React from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  Database,
  Brain,
  MessageSquareQuote,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signInAsGuest, loading, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Background Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">Gemini Reflections</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
              Firebase + Firestore
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-nav-signin"
            onClick={signInWithGoogle}
            disabled={loading}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>Sign In with Google</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 text-center">
        {/* Error notification if any */}
        {error && (
          <div className="mb-8 max-w-lg mx-auto p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start justify-between gap-3 text-left">
            <div>
              <p className="font-semibold text-rose-100">Authentication Notice</p>
              <p className="text-xs mt-1 text-rose-300">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-rose-400 hover:text-rose-200 text-xs underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 text-xs mb-8 shadow-inner">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-Knowledge Isolation & Google Federated Identity</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight sm:leading-none">
          Your private sanctuary for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">deep reflection</span> & brainstorming.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-stone-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Write multi-turn journal entries, converse with <strong className="text-white">Gemini 3.6 Flash</strong> for cognitive reframing and structured takeaways, with every word strictly isolated to your private Cloud Firestore vault.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="btn-hero-google-signin"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#000000"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#000000"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#000000"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#000000"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign In with Google'}</span>
          </button>

          <button
            id="btn-hero-guest-signin"
            onClick={signInAsGuest}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-stone-700 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-stone-400" />
            <span>Continue as Guest / Demo</span>
          </button>
        </div>

        {/* Security & Architecture Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm flex flex-col justify-between hover:border-stone-700 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Federated Google Authentication
              </h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Powered by Firebase Auth. We never manage or store plaintext passwords. Auth state is verifiable and encrypted in transit.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-800/80 flex items-center gap-2 text-xs text-stone-400">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>OWASP Top 10 Auth Compliant</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm flex flex-col justify-between hover:border-stone-700 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                UID-Partitioned Cloud Firestore
              </h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Every reflection is stored under <code className="text-emerald-300 font-mono text-[11px]">/users/&#123;uid&#125;/reflections/</code> with strict owner-bound Firestore security rules.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-800/80 flex items-center gap-2 text-xs text-stone-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Cross-User Data Exposure</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm flex flex-col justify-between hover:border-stone-700 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Gemini 3.6 Flash Multi-Turn AI
              </h3>
              <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
                Multi-turn conversation flow with resilient fallback ladders. Automatically extracts key takeaways, themes, and emotional summaries.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-800/80 flex items-center gap-2 text-xs text-stone-400">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>High Availability Fallback Ladder</span>
            </div>
          </div>
        </div>

        {/* User Flow Stepper */}
        <div className="mt-20 p-8 rounded-2xl bg-stone-900/40 border border-stone-800 text-left">
          <h3 className="text-lg font-semibold text-stone-200 mb-6 text-center">
            How Your Reflection Journey Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h4 className="text-sm font-semibold text-white">Sign In</h4>
              <p className="text-xs text-stone-400 mt-1">
                Authenticate with Google or Guest mode to securely claim your private vault.
              </p>
            </div>

            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h4 className="text-sm font-semibold text-white">Express & Reflect</h4>
              <p className="text-xs text-stone-400 mt-1">
                Choose a reflection mode (Mindful, Brainstorm, Action) and write your thoughts.
              </p>
            </div>

            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h4 className="text-sm font-semibold text-white">Converse with Gemini</h4>
              <p className="text-xs text-stone-400 mt-1">
                Engage in multi-turn dialogue. Get cognitive reframing, insights, and summaries.
              </p>
            </div>

            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h4 className="text-sm font-semibold text-white">Vaulted in Firestore</h4>
              <p className="text-xs text-stone-400 mt-1">
                Every transcript is synced in real-time to your isolated Firestore collection.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 border-t border-stone-900 text-stone-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>Gemini Reflection Journal &copy; 2026. Built with Google GenAI SDK & Cloud Firestore.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Zero Insecure Defaults
          </span>
          <span>&bull;</span>
          <span>Owner-Bound Storage</span>
        </div>
      </footer>
    </div>
  );
};
