/**
 * Formats a customer/user phone as "+52 6141234567".
 * Handles the legacy case where phone_country_code was stored with a leading "+".
 */
export function formatPhone(obj) {
  if (!obj?.phone_e164) return obj?.phone_number ?? ''
  const cc = String(obj.phone_country_code ?? '').replace(/^\+/, '')
  return obj.phone_e164.replace(new RegExp(`^\\+${cc}`), `+${cc} `)
}
