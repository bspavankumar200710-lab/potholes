import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { modalOverlayVariants, modalDialogVariants, buttonPressProps } from '../utils/motion';
import {
  Database,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
  ShieldCheck,
  Users,
  AlertTriangle,
  Brain,
  RefreshCw,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeCollection, setActiveCollection] = useState<'detections' | 'users' | 'agentLearnings'>('detections');
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`;

  const fetchCollectionData = async (colName: string) => {
    setIsLoading(true);
    try {
      const colRef = collection(db, colName);
      const q = query(colRef, limit(30));
      const snap = await getDocs(q);
      const docs: any[] = [];
      snap.forEach((d) => docs.push({ _id: d.id, ...d.data() }));
      setRecords(docs);
    } catch (err) {
      console.warn('Could not query Firestore collection:', err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCollectionData(activeCollection);
    }
  }, [isOpen, activeCollection]);

  const handleExportFullJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `firestore_${activeCollection}_dump.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyConsoleUrl = async () => {
    try {
      await navigator.clipboard.writeText(consoleUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          <motion.div
            variants={modalDialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]"
          >
            {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">Backend Firestore Database</h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Live Cloud Data
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
                Database ID: {firebaseConfig.firestoreDatabaseId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Config Banner */}
        <div className="bg-slate-950/40 p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-slate-400">
              <strong className="text-slate-200">Firebase Project:</strong> {firebaseConfig.projectId}
            </div>
            <div className="text-slate-400">
              <strong className="text-slate-200">Storage Provider:</strong> Google Cloud Firestore NoSQL
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyConsoleUrl}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'URL Copied' : 'Copy Console Link'}</span>
            </button>

            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Firebase Console</span>
            </a>
          </div>
        </div>

        {/* Collection Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCollection('detections')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCollection === 'detections'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>detections ({records.length})</span>
            </button>

            <button
              onClick={() => setActiveCollection('users')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCollection === 'users'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>users</span>
            </button>

            <button
              onClick={() => setActiveCollection('agentLearnings')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeCollection === 'agentLearnings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>agentLearnings</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCollectionData(activeCollection)}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportFullJSON}
              className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700"
            >
              <Download className="w-3 h-3" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Live Records Viewer */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Querying Cloud Firestore collection...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No documents currently stored in collection <strong className="text-slate-300">"{activeCollection}"</strong>.
            </div>
          ) : (
            records.map((doc, idx) => (
              <div
                key={doc._id || idx}
                className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-blue-400 border-b border-slate-900 pb-2 mb-2 font-bold">
                  <span>Document ID: {doc._id}</span>
                  <span className="text-slate-500 font-normal">
                    {doc.timestamp ? new Date(doc.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                  {JSON.stringify(doc, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>
            Connected via SDK directly to project <code className="text-cyan-400">{firebaseConfig.projectId}</code>
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
          >
            Close Explorer
          </button>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
