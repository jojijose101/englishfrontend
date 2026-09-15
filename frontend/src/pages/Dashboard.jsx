import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { endGuestSession } from '../guest'

export default function Dashboard({ user }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    endGuestSession()
    try {
      await signOut(auth)
    } catch {
      // Guest sessions have no Firebase user
    }
    navigate('/login')
  }

  const username = user?.email?.split('@')[0] || 'Learner'

  const modes = [
    {
      emoji: '💬',
      title: 'Free Conversation',
      desc: 'Talk freely about any topic with your AI tutor',
      mode: 'free',
    },
    {
      emoji: '📝',
      title: 'Grammar Practice',
      desc: 'Speak and get instant grammar corrections',
      mode: 'grammar',
    },
    {
      emoji: '🎭',
      title: 'Role Play',
      desc: 'Practice job interviews and daily life situations',
      mode: 'roleplay',
    },
  ]

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <nav
        style={{
          background: '#1e1b4b',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🎙️ SpeakSmart
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Hello, {username}! 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 40px 0', fontSize: '15px' }}>
          Ready for your English practice today?
        </p>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#a5b4fc',
            margin: '0 0 20px 0',
          }}
        >
          Choose Practice Mode
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '32px',
          }}
          className="modes-grid"
        >
          {modes.map((m) => (
            <ModeCard key={m.mode} {...m} onClick={() => navigate('/practice?mode=' + m.mode)} />
          ))}
        </div>

        <div
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6' }}>
            <strong style={{ color: '#a5b4fc' }}>Tip:</strong> Hold the microphone, speak for at least
            two seconds, then release. Use headphones so Miss Nova’s voice does not echo into the mic.
          </p>
        </div>
      </main>
    </div>
  )
}

function ModeCard({ emoji, title, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '20px',
        padding: '28px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.7)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '16px' }}>{emoji}</div>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'white', margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
          flex: 1,
        }}
      >
        {desc}
      </p>
      <span style={{ color: '#6366f1', fontWeight: '600', fontSize: '14px' }}>Start →</span>
    </div>
  )
}
