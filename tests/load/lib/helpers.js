import { check } from "k6"
import { SESSION_COOKIE } from "./config.js"

export function headers(extraHeaders = {}) {
  const baseHeaders = {
    Accept: "application/json",
    ...extraHeaders,
  }

  if (SESSION_COOKIE) {
    baseHeaders.Cookie = SESSION_COOKIE
  }

  return baseHeaders
}

export function jsonHeaders(extraHeaders = {}) {
  return headers({
    "Content-Type": "application/json",
    ...extraHeaders,
  })
}

export function parseJson(response) {
  try {
    return response.json()
  } catch (_error) {
    return null
  }
}

export function checkJson(response, name = "response is JSON") {
  return check(response, {
    [name]: (res) => parseJson(res) !== null,
  })
}

export function checkUnifiedSuccess(response, name = "unified success response") {
  return check(response, {
    [name]: (res) => {
      const body = parseJson(res)
      return body !== null && body.ok === true && Object.prototype.hasOwnProperty.call(body, "data")
    },
  })
}

export function checkUnifiedError(response, code, name = "unified error response") {
  return check(response, {
    [name]: (res) => {
      const body = parseJson(res)
      return body !== null && body.ok === false && body.error && body.error.code === code
    },
  })
}

export function checkStatus(response, expected, name) {
  return check(response, {
    [name || `status is ${expected}`]: (res) => res.status === expected,
  })
}
