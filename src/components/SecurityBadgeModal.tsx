import React from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  Database,
  KeyRound,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SecurityBadgeModalProps {
  onClose: () => void;
}

export const SecurityBadgeModal: React.FC<SecurityBadgeModalProps> = ({ onClose }) => {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col text-stone-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex items-start justify-between gap-4 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Security Architecture & Privacy Policy
              </h2>
              <p className="text-xs text-stone-400">
                Cloud Firestore user isolation, zero insecure defaults & token security
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* User Isolated Storage Path */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Database className="w-4 h-4" />
              <span>Your Isolated Firestore Document Path</span>
            </div>
            <p className="text-xs text-stone-300">
              Your journal entries and reflections are strictly bound to your authenticated user ID:
            </p>
            <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 font-mono text-emerald-300 text-xs break-all">
              /databases/(default)/documents/users/{user?.uid || '{USER_UID}'}/reflections/*
            </div>
            <p className="text-[11px] text-stone-400">
              Cross-user reads and writes are rejected at the database level by Cloud Firestore security rules.
            </p>
          </div>

          {/* Active Security Rules */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-stone-200 font-semibold">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span>Active Firestore Security Rules (`firestore.rules`)</span>
            </div>
            <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-[11px] font-mono text-stone-300 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Zero insecure defaults
    match /{document=**} {
      allow read, write: if false;
    }

    // 2. User-isolated documents strictly bound to UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>

          {/* OWASP Top 10 Protections */}
          <div className="space-y-3">
            <h4 className="text-stone-200 font-semibold">OWASP Security Standard Verifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>A01: Broken Access Control</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  Client cannot read or write any document outside their own UID partition.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>A03 / LLM02: Input Validation</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  Defensive payload ingestion and strict undefined-stripping on all database writes.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>LLM01: Prompt Injection Defense</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  User text is treated as plain conversational content, isolated from system instructions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Zero Hardcoded Secrets</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  Gemini API keys are maintained server-side via Secret Manager and environment variables.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors"
          >
            Close Security Brief
          </button>
        </div>
      </div>
    </div>
  );
};
