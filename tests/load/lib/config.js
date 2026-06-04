export const BASE_URL = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "")
export const SESSION_COOKIE = __ENV.SESSION_COOKIE || ""
export const K6_VUS = Number(__ENV.K6_VUS || 5)
export const K6_DURATION = __ENV.K6_DURATION || "30s"

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500"],
}

export const RELAXED_API_THRESHOLDS = {
  http_req_failed: ["rate<0.02"],
  http_req_duration: ["p(95)<1500"],
}

export const AI_THRESHOLDS = {
  http_req_failed: ["rate<0.05"],
  http_req_duration: ["p(95)<120000"],
}
