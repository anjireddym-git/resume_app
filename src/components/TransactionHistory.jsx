import React from 'react';
import { X, Receipt, CheckCircle, Clock, XCircle, Coins } from 'lucide-react';
import { useCredits } from '../contexts/CreditsContext';

const TransactionHistory = ({ isOpen, onClose }) => {
  const { transactions } = useCredits();

  if (!isOpen) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-neutral-100 text-neutral-700';
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Purchase History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No purchases yet</h3>
              <p className="text-sm text-neutral-500">
                Your purchase history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-100"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tx.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">
                          +{tx.amount} credits
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-neutral-900">
                      ${tx.dollarAmount?.toFixed(2) || '2.00'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
          <p className="text-xs text-neutral-500 text-center">
            Each credit equals one AI operation. Purchases are non-refundable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
