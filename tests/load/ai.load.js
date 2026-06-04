import http from "k6/http"
import { sleep } from "k6"
import { AI_THRESHOLDS, BASE_URL, SESSION_COOKIE } from "./lib/config.js"
import { checkStatus, checkUnifiedError, jsonHeaders, parseJson } from "./lib/helpers.js"
import { check } from "k6"

export const options = {
  vus: Number(__ENV.K6_AI_VUS || 1),
  duration: __ENV.K6_AI_DURATION || "20s",
  thresholds: AI_THRESHOLDS,
}

export default function () {
  const response = http.post(
    `${BASE_URL}/api/ai/chat`,
    JSON.stringify({
      message: "Say hello",
    }),
    {
      headers: jsonHeaders(),
      timeout: "120s",
    },
  )

  if (SESSION_COOKIE) {
    checkStatus(response, 200, "authenticated AI status is 200")
    check(response, {
      "AI success response has message": (res) => {
        const body = parseJson(res)
        return body !== null && body.ok === true && body.data && typeof body.data.message === "string" && body.data.message.length > 0
      },
    })
  } else {
    checkStatus(response, 401, "unauthenticated AI status is 401")
    checkUnifiedError(response, "UNAUTHORIZED", "unauthenticated AI error uses unified shape")
  }

  sleep(3)
}
