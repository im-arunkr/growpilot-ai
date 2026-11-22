
/**
 * GrowPilot AI — Global Application Configuration
 */

export const APP_CONFIG = {
  name: "GrowPilot AI",
  description: "AI-powered Business Growth Assistant",

  businessId:
    process.env.NEXT_PUBLIC_BUSINESS_ID ||
    "59e2676c-2175-e58d-033d-cc56183bd875",

  demoMode: true,
} as const;
