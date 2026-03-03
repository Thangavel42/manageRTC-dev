/**
 * Clerk Logout Utility
 * Provides a global way to sign out from Clerk
 * This can be called from anywhere in the app (including API interceptors)
 */

// Store the signOut function globally
let globalSignOut: (() => Promise<void>) | null = null;

/**
 * Initialize the global signOut function
 * Call this from a component that has access to Clerk hooks
 */
export const initGlobalSignOut = (signOutFn: () => Promise<void>) => {
  globalSignOut = signOutFn;
  console.log('[ClerkLogout] Global signOut initialized');
};

/**
 * Sign out from Clerk and clear all local storage
 * This can be called from anywhere (API interceptors, error handlers, etc.)
 */
export const signOutAndClear = async () => {
  console.log('[ClerkLogout] Signing out...');

  try {
    // Call Clerk's signOut if available
    if (globalSignOut) {
      await globalSignOut();
      console.log('[ClerkLogout] Clerk signOut successful');
    } else {
      console.warn('[ClerkLogout] Global signOut not initialized, clearing storage only');
    }
  } catch (error) {
    console.error('[ClerkLogout] Clerk signOut failed:', error);
  }

  // Always clear local storage (fallback)
  localStorage.clear();
  sessionStorage.clear();
  console.log('[ClerkLogout] Storage cleared');

  // Redirect to login
  window.location.href = '/login?error=account_locked';
};

const clerkLogoutUtils = { initGlobalSignOut, signOutAndClear };
export default clerkLogoutUtils;
