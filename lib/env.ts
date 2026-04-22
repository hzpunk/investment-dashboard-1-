export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,

  // External APIs
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || "demo",
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || "",

  // App settings
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  DEFAULT_CURRENCY: "USD",
}

