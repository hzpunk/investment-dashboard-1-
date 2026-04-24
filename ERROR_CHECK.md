# Проверка ошибок - InvestTrack

**Дата:** 24 апреля 2026

## 1. Ошибки сборки (Build)

> my-v0-project@0.1.0 build /Users/hzpunk/Downloads/Desktop/investment-dashboard (1)
> next build

   ▲ Next.js 15.2.4
   - Environments: .env.local, .env
   - Experiments (use with caution):
     ✓ webpackBuildWorker
     ✓ parallelServerCompiles
     ✓ parallelServerBuildTraces

   Creating an optimized production build ...
 ✓ Compiled successfully in 2000ms
   Skipping validation of types
   Skipping linting
   Collecting page data ...
   Generating static pages (0/50) ...
   Generating static pages (12/50) 
   Generating static pages (24/50) 
   Generating static pages (37/50) 
 ✓ Generating static pages (50/50)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      226 B         101 kB
├ ○ /_not-found                            983 B         102 kB
├ ○ /accounts                             4.7 kB         156 kB
├ ƒ /accounts/[id]                       7.86 kB         156 kB
├ ○ /admin/assets                        6.36 kB         158 kB
├ ○ /admin/notifications                 7.75 kB         162 kB
├ ○ /admin/processes                     10.5 kB         132 kB
├ ○ /admin/security                      4.47 kB         132 kB
├ ○ /admin/settings                      9.98 kB         140 kB
├ ○ /admin/users                         5.91 kB         157 kB
├ ○ /analytics                           7.71 kB         129 kB
├ ƒ /api/ai/chat                           226 B         101 kB
├ ƒ /api/analytics                         226 B         101 kB
├ ƒ /api/auth/login                        226 B         101 kB
├ ƒ /api/auth/logout                       226 B         101 kB
├ ƒ /api/auth/me                           226 B         101 kB
├ ƒ /api/auth/password                     226 B         101 kB
├ ƒ /api/auth/register                     226 B         101 kB
├ ƒ /api/cron/update-prices                226 B         101 kB
├ ƒ /api/data/accounts                     226 B         101 kB
├ ƒ /api/data/assets                       226 B         101 kB
├ ƒ /api/data/bootstrap                    226 B         101 kB
├ ƒ /api/data/goals                        226 B         101 kB
├ ƒ /api/data/portfolios                   226 B         101 kB
├ ƒ /api/data/portfolios/[id]/stats        226 B         101 kB
├ ƒ /api/data/profiles                     226 B         101 kB
├ ƒ /api/data/transactions                 226 B         101 kB
├ ƒ /api/data/transactions/recent          226 B         101 kB
├ ƒ /api/dividends                         226 B         101 kB
├ ƒ /api/export                            226 B         101 kB
├ ƒ /api/health                            226 B         101 kB
├ ƒ /api/import                            226 B         101 kB
├ ƒ /api/market-data                       226 B         101 kB
├ ƒ /api/notifications                     226 B         101 kB
├ ƒ /api/portfolio/rebalance               226 B         101 kB
├ ○ /assets                              5.03 kB         157 kB
├ ƒ /assets/[id]                         9.36 kB         157 kB
├ ○ /dashboard                           15.4 kB         174 kB
├ ○ /goals                                  7 kB         139 kB
├ ƒ /goals/[id]                          7.55 kB         125 kB
├ ○ /legal                               2.45 kB         123 kB
├ ○ /legal/consent                       1.79 kB         134 kB
├ ○ /legal/cookies                       1.63 kB         127 kB
├ ○ /legal/privacy                         881 B         127 kB
├ ○ /legal/risks                         1.59 kB         127 kB
├ ○ /legal/terms                           881 B         127 kB
├ ○ /login                               4.33 kB         125 kB
├ ○ /notifications                       4.35 kB         122 kB
├ ○ /portfolios                          5.98 kB         138 kB
├ ƒ /portfolios/[id]                     5.51 kB         161 kB
├ ○ /register                            3.78 kB         131 kB
├ ○ /settings                             5.8 kB         130 kB
└ ○ /transactions                        5.88 kB         157 kB
+ First Load JS shared by all             101 kB
  ├ chunks/0c9ff6e7-eb71fac8c03142df.js  53.2 kB
  ├ chunks/4745-8007791d1b629437.js      45.8 kB
  └ other shared chunks (total)          1.92 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

