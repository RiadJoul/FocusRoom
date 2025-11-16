import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PremiumState {
  // Premium status
  isPremium: boolean;
  isInTrialPeriod: boolean;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  
  // User tracking
  trialStartDate: string | null; // When user first signed up
  hasUsedTrial: boolean; // Whether user has ever had a trial
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  checkPremiumStatus: () => Promise<void>;
  setTrialStartDate: (date: string) => void;
  setIsPremium: (isPremium: boolean) => void; // For testing
}

const ENTITLEMENT_ID = 'Premium'; // Your RevenueCat entitlement ID

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPremium: false,
      isInTrialPeriod: false,
      trialEndDate: null,
      subscriptionEndDate: null,
      trialStartDate: null,
      hasUsedTrial: false,
      isLoading: false,

      // Check premium status from RevenueCat
      checkPremiumStatus: async () => {
        try {
          set({ isLoading: true });
          
          // Get customer info from RevenueCat
          const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
          
          // Check if user has premium entitlement
          const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
          
          if (entitlement) {
            // User has active premium access
            const isPremium = true;
            const isInTrial = entitlement.periodType === 'TRIAL';
            const expirationDate = entitlement.expirationDate;
            
            // Track if user has ever used trial
            if (isInTrial && !get().hasUsedTrial) {
              set({ hasUsedTrial: true });
            }
            
            set({
              isPremium,
              isInTrialPeriod: isInTrial,
              trialEndDate: isInTrial ? expirationDate : null,
              subscriptionEndDate: expirationDate,
              isLoading: false,
            });
            
            console.log('✅ Premium Status:', {
              isPremium,
              isInTrial,
              expiresAt: expirationDate,
            });
          } else {
            // User does not have premium
            set({
              isPremium: false,
              isInTrialPeriod: false,
              trialEndDate: null,
              subscriptionEndDate: null,
              isLoading: false,
            });
            
            console.log('❌ User is not premium');
          }
        } catch (error) {
          console.error('Error checking premium status:', error);
          set({ isLoading: false });
        }
      },

      // Set trial start date when user first signs up
      setTrialStartDate: (date: string) => {
        set({ trialStartDate: date });
      },

      // Manual override for testing
      setIsPremium: (isPremium: boolean) => {
        set({ isPremium });
      },
    }),
    {
      name: 'premium-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist important fields
      partialize: (state) => ({
        isPremium: state.isPremium,
        isInTrialPeriod: state.isInTrialPeriod,
        trialEndDate: state.trialEndDate,
        subscriptionEndDate: state.subscriptionEndDate,
        trialStartDate: state.trialStartDate,
        hasUsedTrial: state.hasUsedTrial,
      }),
    }
  )
);
