import React, { useState } from 'react';
import { Coins, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { useCredits } from '../contexts/CreditsContext';
import TransactionHistory from './TransactionHistory';

const CreditsDisplay = () => {
  const { 
    credits, 
    loading, 
    canPurchase, 
    purchaseCredits, 
    purchaseLoading,
    error,
    clearError
  } = useCredits();
  
  const [showHistory, setShowHistory] = useState(false);
  const creditsLabel = new Intl.NumberFormat('en-US').format(credits || 0);

  if (loading) {
    return (
      <div
        className="h-9 w-[120px] rounded-lg border border-neutral-200 bg-white shadow-sm flex items-center justify-center dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Loading credits"
      >
        <Loader2 className="w-4 h-4 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Credits Badge */}
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-2.5 sm:px-3 shadow-sm flex items-center gap-2 text-neutral-700 hover:bg-neutral-50 transition-colors dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label={`${creditsLabel} credits available`}
          title="View credit balance and transaction history"
        >
          <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-400/15 dark:text-amber-300">
            <Coins className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold tabular-nums">{creditsLabel}</span>
          <span className="hidden sm:inline text-xs text-neutral-500 dark:text-neutral-400">credits</span>
        </button>

        {/* Buy Credits Button */}
        {canPurchase && (
          <button
            onClick={purchaseCredits}
            disabled={purchaseLoading}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            title="Buy 50 credits for $2"
          >
            {purchaseLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">$2 for 50</span>
          </button>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={clearError}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Transaction History Modal */}
      <TransactionHistory 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </>
  );
};

export default CreditsDisplay;
