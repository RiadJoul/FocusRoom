import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { analytics, Events } from '@/lib/analytics';
import { getPlanTypeFromRevenueCat } from '@/lib/revenuecat';
import { updatePremiumStatus } from '@/lib/hooks/usePremiumStatus';

type PaywallSource =
  | 'root_layout_trial'
  | 'profile_screen'
  | 'floating_recurring_button'
  | 'task_selection_modal'
  | string;

interface PresentPaywallOptions {
  userId?: string;
  source?: PaywallSource;
}

/**
 * Single source of truth for presenting the RevenueCat paywall.
 * Handles analytics, determining plan type, and updating premium status.
 */
export async function presentPaywallOnce(
  options: PresentPaywallOptions = {}
): Promise<boolean> {
  const { userId, source } = options;

  try {
    const openTime = Date.now();

    await analytics.track(Events.PAYWALL_VIEWED, {
      user_id: userId,
      source,
    });

    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    const closeTime = Date.now();
    const durationSeconds = Math.round((closeTime - openTime) / 1000);

    await analytics.track(Events.PAYWALL_CLOSED, {
      user_id: userId,
      duration_seconds: durationSeconds,
      source,
    });

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
        return false;

      case PAYWALL_RESULT.PURCHASED: {
        const planType = await getPlanTypeFromRevenueCat();
        await analytics.track(Events.SUBSCRIPTION_STARTED, {
          user_id: userId,
          plan_type: planType ?? 'unknown',
          source,
        });

        await updatePremiumStatus(true);
        return true;
      }

      case PAYWALL_RESULT.RESTORED:
        await updatePremiumStatus(true);
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Paywall error:', error);
    return false;
  }
}

