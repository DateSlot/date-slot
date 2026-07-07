const store = new Map()
let lastCleanup = Date.now()

export const DEFAULTS = { max: 20, windowMs: 60000 }

export function rateLimit(req, options = {}) {
  const { max = DEFAULTS.max, windowMs = DEFAULTS.windowMs } = options
  const now = Date.now()

  if (now - lastCleanup >= 60000) {
    for (const [ip, timestamps] of store) {
      const valid = timestamps.filter(t => now - t < windowMs)
      if (valid.length === 0) store.delete(ip)
      else store.set(ip, valid)
    }
    lastCleanup = now
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            || req.headers["x-real-ip"]
            || req.socket?.remoteAddress
            || req.connection?.remoteAddress
            || `req_${Date.now()}`

  if (!store.has(ip)) {
    store.set(ip, [])
  }

  const timestamps = store.get(ip)
  const windowStart = now - windowMs

  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift()
  }

  if (timestamps.length >= max) {
    const reset = timestamps[0] + windowMs
    return { allowed: false, remaining: 0, reset }
  }

  timestamps.push(now)
  const remaining = max - timestamps.length
  const reset = now + windowMs
  return { allowed: true, remaining, reset }
}
