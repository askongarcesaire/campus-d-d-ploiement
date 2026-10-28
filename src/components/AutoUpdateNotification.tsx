import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, ArrowUpCircle, X } from 'lucide-react';

declare const __APP_BUILD_TIME__: string | undefined;
declare const __APP_VERSION__: string | undefined;

interface VersionInfo {
  version: string;
  buildTime?: string;
  app?: string;
}

const LOCAL_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '1.0.0';
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';

export const AutoUpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [autoReloadCountdown, setAutoReloadCountdown] = useState<number | null>(null);

  // Check for newer version on Vercel host
  const checkForUpdate = useCallback(async (manual = false) => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      // Fetch /version.json with cache buster
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }).catch(() => null);

      if (res && res.ok) {
        const data: VersionInfo = await res.json().catch(() => null);
        if (data && data.buildTime) {
          // If server buildTime is strictly newer than our loaded local buildTime
          if (data.buildTime !== LOCAL_BUILD_TIME) {
            setLatestVersion(data.version || 'Nouvelle version');
            setUpdateAvailable(true);
            setIsDismissed(false);
            return;
          }
        }
      }

      // Fallback check on /api/health
      const healthRes = await fetch(`/api/health?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }).catch(() => null);

      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json().catch(() => null);
        if (healthData?.version && healthData.version !== CURRENT_VERSION) {
          setLatestVersion(healthData.version);
          setUpdateAvailable(true);
          setIsDismissed(false);
        }
      }
    } catch (err) {
      // Silent error during background poll
      if (manual) console.warn('Erreur vérification mise à jour Vercel:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Periodic polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdate(false);
    }, 60000);

    // Also check when browser tab regains visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Initial check after 10s of booting
    const timer = setTimeout(() => checkForUpdate(false), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [checkForUpdate]);

  // Handle dynamic Vite chunk loading errors automatically
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      const msg = e.message || '';
      if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Importing a module script failed')
      ) {
        console.warn('⚡ Détection de nouveau bundle Vercel déployé. Rechargement automatique...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  const handleApplyUpdate = () => {
    // Hard reload from server
    window.location.reload();
  };

  if (!updateAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wide text-amber-300 uppercase">
              Mise à jour Vercel disponible
            </span>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 -mr-1"
              title="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-200 mt-1 leading-snug">
            Une nouvelle version optimisée de CampusHub vient d'être déployée sur Vercel.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleApplyUpdate}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mettre à jour maintenant</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-2.5 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
