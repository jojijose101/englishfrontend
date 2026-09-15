import { useState, useEffect } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import { GUEST_USER, isGuestSession } from './guest'

export default function App() {
  const [user, setUser] = useState(isGuestSession() ? GUEST_USER : null)
  const [loading, setLoading] = useState(!isGuestSession())

  useEffect(() => {
    const applyGuest = () => {
      if (isGuestSession()) {
        setUser(GUEST_USER)
        setLoading(false)
      }
    }
    window.addEventListener('speaksmart-guest', applyGuest)

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u)
      } else if (isGuestSession()) {
        setUser(GUEST_USER)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => {
      window.removeEventListener('speaksmart-guest', applyGuest)
      unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1b4b',
        }}
      >
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard user={user} /> : <Login />} />
      <Route path="/practice" element={user ? <Practice user={user} /> : <Login />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    </Routes>
  )
}
