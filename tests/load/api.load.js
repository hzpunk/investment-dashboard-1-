import http from "k6/http"
import { sleep } from "k6"
import { BASE_URL, K6_DURATION, K6_VUS, RELAXED_API_THRESHOLDS, SESSION_COOKIE } from "./lib/config.js"
import { checkJson, checkStatus, checkUnifiedError, checkUnifiedSuccess, headers } from "./lib/helpers.js"

export const options = {
  vus: K6_VUS,
  duration: K6_DURATION,
  thresholds: RELAXED_API_THRESHOLDS,
}

export default function () {
  const health = http.get(`${BASE_URL}/api/health`)
  checkStatus(health, 200, "health status is 200")
  checkUnifiedSuccess(health, "health response uses unified success shape")

  const accounts = http.get(`${BASE_URL}/api/data/accounts`, {
    headers: headers(),
  })

  if (SESSION_COOKIE) {
    checkStatus(accounts, 200, "authenticated accounts status is 200")
    checkUnifiedSuccess(accounts, "authenticated accounts response uses unified success shape")
  } else {
    checkStatus(accounts, 401, "unauthenticated accounts status is 401")
    checkUnifiedError(accounts, "UNAUTHORIZED", "unauthenticated accounts error uses unified shape")
  }

  const missingAsset = http.get(`${BASE_URL}/api/data/assets/00000000-0000-0000-0000-000000000000`, {
    headers: headers(),
  })
  checkJson(missingAsset, "missing asset response is JSON")

  sleep(1)
}
