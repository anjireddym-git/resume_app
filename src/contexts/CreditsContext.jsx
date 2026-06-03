import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, functions, httpsCallable } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { analyticsService } from '../services/analyticsService';
import { PURCHASABLE_CREDIT_PLANS, getCreditPlan } from '../config/creditPlans';

const CreditsContext = createContext(null);

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};

export const CreditsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState(null);

  // Real-time listener for credits
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setCredits(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setCredits(doc.data().credits || 0);
      } else {
        setCredits(0);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to credits:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  // Real-time listener for transactions
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setTransactions([]);
      return;
    }

    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setTransactions(txList);
    }, (err) => {
      console.error('Error listening to transactions:', err);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.uid]);

  const canPurchase = true;

  // Check if user has enough credits for AI call
  const hasCredits = credits >= 1;

  // Initiate Stripe checkout
  const purchaseCredits = async (planId) => {
    const plan = getCreditPlan(planId);
    if (!plan?.checkoutEnabled) {
      setError('Select a valid credit plan.');
      return null;
    }

    setPurchaseLoading(true);
    setError(null);
    
    // Track purchase initiation
    analyticsService.trackCreditsPurchaseInitiated(plan.credits, plan.price);

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({ planId: plan.id });
      
      // Redirect to Stripe checkout
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
      
      return result.data;
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to start checkout');
      analyticsService.trackAPIError('credits/purchase', 'CHECKOUT_FAILED', err.message);
      return null;
    } finally {
      setPurchaseLoading(false);
    }
  };

  const value = {
    credits,
    loading,
    transactions,
    canPurchase,
    hasCredits,
    purchaseCredits,
    creditPlans: PURCHASABLE_CREDIT_PLANS,
    purchaseLoading,
    error,
    clearError: () => setError(null),
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
};

export default CreditsContext;
