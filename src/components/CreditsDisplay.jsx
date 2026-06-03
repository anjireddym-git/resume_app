import React, { useState } from 'react';
import { CheckCircle2, Coins, CreditCard, Loader2, AlertCircle, X } from 'lucide-react';
import { useCredits } from '../contexts/CreditsContext';
import TransactionHistory from './TransactionHistory';
import { CREDIT_PLANS } from '../config/creditPlans';

const formatCredits = (value) => new Intl.NumberFormat('en-US').format(value || 0);

const CreditPlansModal = ({ isOpen, onClose, plans, onPurchase, purchaseLoading }) => {
  if (!isOpen) return null;
  const freePlan = CREDIT_PLANS.free;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-2xl flex flex-col dark:bg-neutral-950">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Credit plans</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Credits are cumulative and only resume generation or AI imports spend them.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={purchaseLoading}
            className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-900"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-3 dark:border-emerald-900/70 dark:bg-emerald-950/40">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {freePlan.name}: {formatCredits(freePlan.credits)} credits for new accounts
              </p>
              <p className="text-xs text-emerald-700 mt-0.5 dark:text-emerald-300">{freePlan.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-neutral-200 p-4 flex flex-col gap-4 dark:border-neutral-800">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{plan.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">${plan.price}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">one-time</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {formatCredits(plan.credits)} credits
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{plan.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onPurchase(plan.id)}
                  disabled={purchaseLoading}
                  className="mt-auto h-10 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                >
                  {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Buy plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreditsDisplay = () => {
  const { 
    credits, 
    loading, 
    purchaseCredits, 
    creditPlans,
    purchaseLoading,
    error,
    clearError
  } = useCredits();
  
  const [showHistory, setShowHistory] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const creditsLabel = formatCredits(credits);

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

        <button
          onClick={() => setShowPlans(true)}
          disabled={purchaseLoading}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          title="Buy credits"
        >
          {purchaseLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Buy</span>
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
      <CreditPlansModal
        isOpen={showPlans}
        onClose={() => setShowPlans(false)}
        plans={creditPlans}
        onPurchase={purchaseCredits}
        purchaseLoading={purchaseLoading}
      />
    </>
  );
};

export default CreditsDisplay;
