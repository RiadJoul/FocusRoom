import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import Purchases from 'react-native-purchases';
import { useUserStore } from '@/lib/stores/userStore';

export function usePremiumSync(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const syncPremiumStatus = async () => {
      try {
        // Get RevenueCat info
        const customerInfo = await Purchases.getCustomerInfo();
        const isPremium = customerInfo.activeSubscriptions.length > 0;

        // Update Supabase
        await supabase
          .from('users')
          .update({
            is_premium: isPremium,
          })
          .eq('id', userId);

        // Update local user store after supabase update
        useUserStore.getState().setUser({ ...useUserStore.getState().user, is_premium: isPremium });

        // Optionally, notify user if expired
        if (!isPremium) {
          // TODO: Show notification, block access, etc.
        }
      } catch (err) {
        console.error('Premium sync error:', err);
      }
    };

    // Call on mount and optionally on purchase events
    syncPremiumStatus();

    // Listen for purchase updates
    Purchases.addCustomerInfoUpdateListener(syncPremiumStatus);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(syncPremiumStatus);
    };
  }, [userId]);
}