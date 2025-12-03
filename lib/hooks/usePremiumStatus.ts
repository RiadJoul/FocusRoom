import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/lib/stores/userStore';

/**
 * Supabase is the single source of truth for premium.
 * This helper updates both Supabase and the local user store.
 */
export async function updatePremiumStatus(isPremium: boolean) {
  const user = useUserStore.getState().user;

  if (!user?.id) {
    console.warn('updatePremiumStatus called without an authenticated user');
    return;
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ is_premium: isPremium })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update premium status in Supabase:', error);
    } else {
      useUserStore.getState().setUser({
        ...user,
        is_premium: isPremium,
      });
    }
  } catch (err) {
    console.error('Unexpected error updating premium status:', err);
  }
}

/**
 * Convenience hook to read premium status from Supabase-backed user.
 * Use this in UI instead of checking RevenueCat directly.
 */
export function useSupabasePremium() {
  const user = useUserStore((state) => state.user);
  return Boolean(user?.is_premium);
}

