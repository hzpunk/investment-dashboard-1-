import http from "k6/http"
import { sleep } from "k6"
import { BASE_URL, DEFAULT_THRESHOLDS, K6_VUS } from "./lib/config.js"
import { checkJson, checkStatus, checkUnifiedSuccess } from "./lib/helpers.js"

export const options = {
  stages: [
    { duration: "10s", target: K6_VUS },
    { duration: "20s", target: K6_VUS },
    { duration: "10s", target: 0 },
  ],
  thresholds: DEFAULT_THRESHOLDS,
}

export default function () {
  const response = http.get(`${BASE_URL}/api/health`)

  checkStatus(response, 200, "health status is 200")
  checkJson(response, "health response is JSON")
  checkUnifiedSuccess(response, "health response uses unified success shape")

  sleep(1)
}
