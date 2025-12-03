import Purchases from 'react-native-purchases';

const ENTITLEMENT_ID = 'Premium';

/**
 * Get a subscription plan identifier from RevenueCat
 * to send as `plan_type` in analytics.
 *
 * Priority:
 * 1. Active entitlement's productIdentifier (for our Premium entitlement)
 * 2. First active subscription identifier
 */
export async function getPlanTypeFromRevenueCat(): Promise<string | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    const entitlement = customerInfo.entitlements?.active?.[ENTITLEMENT_ID];
    if (entitlement?.productIdentifier) {
      return entitlement.productIdentifier;
    }

    if (customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
      return customerInfo.activeSubscriptions[0] || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to get plan type from RevenueCat:', error);
    return null;
  }
}

