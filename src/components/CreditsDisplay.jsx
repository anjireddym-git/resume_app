import React, { useState } from 'react';
import { Coins, ShoppingCart, History, Loader2, AlertCircle } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Credits Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
          <Coins className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{credits}</span>
          <span className="hidden sm:inline text-xs text-amber-600">credits</span>
        </div>

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

        {/* History Button */}
        <button
          onClick={() => setShowHistory(true)}
          className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          title="Transaction History"
        >
          <History className="w-4 h-4" />
        </button>
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
