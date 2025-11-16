import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Resets navigation to a named route safely.
 * Uses resetRoot when available (recommended).
 */
export async function resetNavigation(routeName: keyof RootStackParamList, params?: object) {
  try {
    if (!navigationRef) return;
    
    // Wait until ready (max 3 seconds)
    const start = Date.now();
    while (!navigationRef.isReady() && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 50));
    }

    if (navigationRef.isReady() && navigationRef.resetRoot) {
      navigationRef.resetRoot({
        index: 0,
        routes: [{ name: routeName as any, params }],
      });
    } else if (navigationRef.dispatch) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: routeName as any, params }],
        })
      );
    } else {
      console.warn('Navigation ref is not ready and has no resetRoot/dispatch fallback');
    }
  } catch (e) {
    console.error('resetNavigation failed', e);
    // Last resort: try push
    try {
      if (navigationRef.isReady()) {
        navigationRef.navigate(routeName as any, params);
      }
    } catch (_err) {
      console.error('Fallback navigation also failed', _err);
    }
  }
}

/**
 * Safe navigation function with readiness check
 */
export async function navigate(name: keyof RootStackParamList, params?: object) {
  try {
    if (!navigationRef) {
      console.warn('Navigation ref not initialized');
      return;
    }
    
    // Wait briefly if not ready
    if (!navigationRef.isReady()) {
      const start = Date.now();
      while (!navigationRef.isReady() && Date.now() - start < 1000) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate(name as any, params);
    } else {
      console.warn('Navigation ref not ready after waiting');
    }
  } catch (e) {
    console.error('Navigation failed:', e);
  }
}

export default {
  navigate,
  reset: resetNavigation,
  getRef: () => navigationRef,
};
