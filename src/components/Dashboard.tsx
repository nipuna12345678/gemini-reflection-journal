import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { JournalEditor } from './JournalEditor';
import { JournalHistory } from './JournalHistory';
import { AggregateSynthesisModal } from './AggregateSynthesisModal';
import { SecurityBadgeModal } from './SecurityBadgeModal';
import { useAuth } from '../context/AuthContext';
import { JournalEntry } from '../types';
import { subscribeUserReflections } from '../lib/firestoreService';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'editor' | 'history' | 'synthesis'>('editor');
  const [activeEntryForEditor, setActiveEntryForEditor] = useState<JournalEntry | null>(null);
  const [editorKey, setEditorKey] = useState<number>(Date.now());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showSynthesisModal, setShowSynthesisModal] = useState<boolean>(false);

  // Subscribe to entries count for header badge and synthesis
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeUserReflections(user.uid, (updated) => {
      setEntries(updated);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle when tab is switched to synthesis
  const handleTabChange = (tab: 'editor' | 'history' | 'synthesis') => {
    if (tab === 'synthesis') {
      setShowSynthesisModal(true);
    } else {
      setCurrentTab(tab);
    }
  };

  // Resume/Edit an existing entry
  const handleSelectEntryToEdit = (entry: JournalEntry) => {
    setActiveEntryForEditor(entry);
    setEditorKey(Date.now());
    setCurrentTab('editor');
  };

  // When user starts a fresh new entry
  const handleNewEntryClick = () => {
    setActiveEntryForEditor(null);
    setEditorKey(Date.now());
    setCurrentTab('editor');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* App Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        openSecurityModal={() => setShowSecurityModal(true)}
        entriesCount={entries.length}
        onNewEntry={handleNewEntryClick}
      />

      {/* Main View Container */}
      <main className="flex-1 pb-16">
        {currentTab === 'editor' && (
          <JournalEditor
            key={editorKey}
            initialEntry={activeEntryForEditor}
            onSaveComplete={(saved) => {
              // updated saved entry in memory if needed
            }}
            onNavigateHistory={() => setCurrentTab('history')}
            onNewEntry={handleNewEntryClick}
          />
        )}

        {currentTab === 'history' && (
          <JournalHistory
            onSelectEntryToEdit={handleSelectEntryToEdit}
            onNewEntryClick={handleNewEntryClick}
          />
        )}
      </main>

      {/* Synthesis Modal */}
      {showSynthesisModal && (
        <AggregateSynthesisModal
          entries={entries}
          onClose={() => setShowSynthesisModal(false)}
        />
      )}

      {/* Security Architecture Modal */}
      {showSecurityModal && (
        <SecurityBadgeModal onClose={() => setShowSecurityModal(false)} />
      )}
    </div>
  );
};
