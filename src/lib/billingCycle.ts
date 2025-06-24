// src/lib/billingCycle.ts - Helper functions for Stripe billing cycles

/**
 * Calculate the next billing cycle reset date based on when user subscribed
 * This follows Stripe's standard billing cycle logic
 */
export const getNextBillingCycleDate = (
  subscriptionStartDate: string | Date
): Date => {
  const startDate = new Date(subscriptionStartDate)
  const today = new Date()
  const nextCycle = new Date(startDate)

  // Start with same day next month
  nextCycle.setMonth(nextCycle.getMonth() + 1)

  // If we're already past this month's billing date, move to next month
  while (nextCycle <= today) {
    nextCycle.setMonth(nextCycle.getMonth() + 1)
  }

  return nextCycle
}

/**
 * Calculate days remaining until next billing cycle
 */
export const getDaysUntilReset = (
  subscriptionStartDate: string | Date
): number => {
  const nextReset = getNextBillingCycleDate(subscriptionStartDate)
  const today = new Date()
  const diffTime = nextReset.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Format billing cycle date for display
 */
export const formatBillingCycleDate = (
  subscriptionStartDate: string | Date
): string => {
  const nextReset = getNextBillingCycleDate(subscriptionStartDate)
  return nextReset.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get billing cycle info object
 */
export const getBillingCycleInfo = (subscriptionStartDate: string | Date) => {
  const nextReset = getNextBillingCycleDate(subscriptionStartDate)
  const daysUntil = getDaysUntilReset(subscriptionStartDate)
  const formatted = formatBillingCycleDate(subscriptionStartDate)

  return {
    nextResetDate: nextReset,
    daysUntilReset: daysUntil,
    formattedDate: formatted,
    isNearReset: daysUntil <= 3,
  }
}
