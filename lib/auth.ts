import { useUserStore } from './stores/userStore';
import { supabase } from './supabase';

export const signOut = async () => {
  try {
    console.log('Signing out...');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    
    console.log('✅ Signed out successfully');
    useUserStore.getState().clearUser();
    
    return { success: true };
  } catch (err) {
    console.error('Exception during sign out:', err);
    throw err;
  }
};
