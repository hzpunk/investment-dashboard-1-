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
  const home = http.get(`${BASE_URL}/`)
  checkStatus(home, 200, "home page status is 200")
  sleep(1)

  const health = http.get(`${BASE_URL}/api/health`)
  checkStatus(health, 200, "health status is 200")
  checkUnifiedSuccess(health, "health response uses unified success shape")
  sleep(1)

  const assets = http.get(`${BASE_URL}/api/data/assets`, {
    headers: headers(),
  })

  if (SESSION_COOKIE) {
    checkStatus(assets, 200, "authenticated assets status is 200")
    checkUnifiedSuccess(assets, "authenticated assets response uses unified success shape")
  } else {
    checkStatus(assets, 401, "unauthenticated assets status is 401")
    checkUnifiedError(assets, "UNAUTHORIZED", "unauthenticated assets error uses unified shape")
  }
  checkJson(assets, "assets response is JSON")

  sleep(1)
}
