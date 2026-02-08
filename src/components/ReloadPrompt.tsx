import React from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { XIcon } from './Icons';

export const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      // console.log('SW Registered: ' + r)
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error)
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-3 max-w-sm animate-[slide-up_0.3s_ease-out]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {offlineReady ? 'Ready to work offline' : 'Update Available'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {offlineReady 
              ? 'Owen AI is cached and ready to be used without internet.' 
              : 'A new version of Owen AI is available.'}
          </p>
        </div>
        <button 
          onClick={close} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
        >
           <XIcon className="w-4 h-4" />
        </button>
      </div>
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-indigo-500/20"
        >
          Update Now
        </button>
      )}
    </div>
  );
};