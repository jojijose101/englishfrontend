const GUEST_KEY = 'speaksmart_guest'

export const GUEST_USER = {
  uid: 'classroom-guest',
  email: 'classroom@speaksmart.local',
  isGuest: true,
}

export function isGuestSession() {
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

export function startGuestSession() {
  sessionStorage.setItem(GUEST_KEY, '1')
}

export function endGuestSession() {
  sessionStorage.removeItem(GUEST_KEY)
}
