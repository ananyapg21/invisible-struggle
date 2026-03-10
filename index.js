import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SEEDS = [
  "I smile all day and fall apart every night.",
  "I keep waiting for someone to notice I'm struggling.",
  "I'm terrified that my best is never enough.",
  "I miss who I was before everything got heavy.",
  "I've been pretending to be okay for so long I forgot what okay feels like.",
  "I'm so tired of being strong.",
  "Every morning I have to convince myself to get up again.",
  "I feel invisible in rooms full of people.",
  "I'm grieving something I can't name.",
  "I love people deeply but feel completely alone.",
  "I keep apologizing for existing.",
  "I'm carrying weight that no one else can see.",
  "I'm trying, quietly, every single day.",
  "I have everything I'm supposed to want and still feel empty.",
  "Some days, getting dressed feels like the hardest thing I'll do.",
]

function Star({ thought, onFlag, isMobile }) {
  const [tipVisible, setTipVisible] = useState(false)
  const [flagged, setFlagged] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const starRef = useRef(null)

  const handleFlag = async (e) => {
    e.stopPropagation()
    if (flagged || flagging) return
    setFlagging(true)
    await fetch('/api/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: thought.id })
    })
    setFlagged(true)
    setFlagging(false)
    setTimeout(() => {
      setTipVisible(false)
      onFlag(thought.id)
    }, 1000)
  }

  const handleEnter = (e) => {
    setTipVisible(true)
    updatePos(e)
  }
  const updatePos = (e) => {
    const touch = e.touches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    const pad = 16
    let x = clientX + pad, y = clientY + pad
    if (x + 260 > window.innerWidth) x = clientX - 260 - pad
    if (y + 120 > window.innerHeight) y = clientY - 120 - pad
    setTipPos({ x, y })
  }

  // Mobile: tap to show tooltip, tap elsewhere to hide
  const handleTap = (e) => {
    if (!isMobile) return
    e.stopPropagation()
    if (tipVisible) { setTipVisible(false); return }
    const rect = starRef.current.getBoundingClientRect()
    let x = rect.right + 12, y = rect.top - 10
    if (x + 260 > window.innerWidth) x = rect.left - 260 - 12
    if (y + 120 > window.innerHeight) y = rect.top - 120
    setTipPos({ x, y })
    setTipVisible(true)
  }

  return (
    <>
      <div
        ref={starRef}
        className={`star ${thought.fresh ? 'fresh' : ''}`}
        style={{ left: thought.x, top: thought.y }}
        onMouseEnter={!isMobile ? handleEnter : undefined}
        onMouseMove={!isMobile ? updatePos : undefined}
        onMouseLeave={!isMobile ? () => setTipVisible(false) : undefined}
        onClick={isMobile ? handleTap : undefined}
      />
      {tipVisible && (
        <div className="tip" style={{ left: tipPos.x, top: tipPos.y }}>
          <p>"{thought.text}"</p>
          {!flagged ? (
            <button className="flag-btn" onClick={handleFlag} disabled={flagging}>
              {flagging ? '…' : 'Report'}
            </button>
          ) : (
            <span className="flag-confirm">Reported — thank you</span>
          )}
        </div>
      )}
    </>
  )
}

export default function Home() {
  const [thoughts, setThoughts] = useState([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null) // null | 'added' | 'review'
  const [isMobile, setIsMobile] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const svgRef = useRef(null)
  const inputRef = useRef(null)

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 600 || 'ontouchstart' in window)
  }, [])

  // Place a thought randomly on the sky, avoiding edges and UI zones
  const placeThought = useCallback((t, fresh = false) => {
    const W = window.innerWidth, H = window.innerHeight
    const marginX = W * 0.08, marginY = H * 0.18
    const x = marginX + Math.random() * (W - marginX * 2)
    const y = marginY + Math.random() * (H - marginY - H * 0.22)
    return { ...t, x, y, fresh }
  }, [])

  // Draw a faint constellation line between two points
  const drawLine = (a, b) => {
    if (!svgRef.current) return
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y)
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y)
    line.setAttribute('stroke', 'rgba(216,176,232,0.07)')
    line.setAttribute('stroke-width', '0.6')
    svgRef.current.appendChild(line)
  }

  // Load thoughts from DB + seed fallback
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/thoughts')
      let data = []
      if (res.ok) data = await res.json()

      // If DB is empty or errored, fall back to seeds
      const source = data.length > 0 ? data : SEEDS.map((text, i) => ({ id: `seed-${i}`, text }))
      const placed = source.map(t => placeThought(t, false))

      // Staggered reveal
      placed.forEach((t, i) => {
        setTimeout(() => {
          setThoughts(prev => {
            const next = [...prev, t]
            // Occasionally draw a line to a random earlier star
            if (next.length > 1 && Math.random() < 0.4) {
              const partner = next[Math.floor(Math.random() * (next.length - 1))]
              setTimeout(() => drawLine(t, partner), 50)
            }
            return next
          })
        }, i * 120 + 200)
      })
      setLoaded(true)
    }
    load()
  }, [placeThought])

  // Real-time: subscribe to new approved thoughts from other users
  useEffect(() => {
    const channel = supabase
      .channel('thoughts-live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'thoughts',
        filter: 'approved=eq.true'
      }, payload => {
        const t = placeThought(payload.new, true)
        setThoughts(prev => {
          const next = [...prev, t]
          if (next.length > 1 && Math.random() < 0.4) {
            const partner = next[Math.floor(Math.random() * (next.length - 1))]
            setTimeout(() => drawLine(t, partner), 50)
          }
          return next
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [placeThought])

  // Gentle float animation
  useEffect(() => {
    let raf
    const float = () => {
      const t = Date.now() / 1000
      document.querySelectorAll('.star').forEach((el, i) => {
        el.style.marginLeft = Math.sin(t * 0.35 + i * 1.3) * 1.8 + 'px'
        el.style.marginTop = Math.cos(t * 0.28 + i * 0.9) * 1.4 + 'px'
      })
      raf = requestAnimationFrame(float)
    }
    float()
    return () => cancelAnimationFrame(raf)
  }, [])

  const removeThought = (id) => setThoughts(prev => prev.filter(t => t.id !== id))

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || submitting) return
    setSubmitting(true)

    const res = await fetch('/api/thoughts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const data = await res.json()
    setSubmitting(false)
    setInput('')

    if (res.status === 201) {
      // Immediately show on this user's screen
      const t = placeThought(data, true)
      setThoughts(prev => [...prev, t])
      setToast('added')
    } else if (data.message === 'received') {
      setToast('review')
    }
    setTimeout(() => setToast(null), 3200)
  }

  // Dismiss mobile tooltips when tapping sky
  const handleSkyTap = () => {
    if (isMobile) {
      // tooltips self-manage; just close keyboard
      inputRef.current?.blur()
    }
  }

  return (
    <div className="root" onClick={handleSkyTap}>
      {/* Background twinkling stars */}
      <div className="bg-stars" aria-hidden>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="bg-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${0.4 + Math.random() * 1.4}px`,
            height: `${0.4 + Math.random() * 1.4}px`,
            '--dur': `${3 + Math.random() * 6}s`,
            '--delay': `${Math.random() * 6}s`,
            '--lo': 0.03 + Math.random() * 0.07,
            '--hi': 0.1 + Math.random() * 0.2,
          }} />
        ))}
      </div>

      {/* Constellation lines */}
      <svg ref={svgRef} className="connections" aria-hidden />

      {/* Thought stars */}
      {thoughts.map(t => (
        <Star key={t.id} thought={t} onFlag={removeThought} isMobile={isMobile} />
      ))}

      {/* Header */}
      <header>
        <div className="wordmark">
          The Invisible Struggle
          <span>a constellation of shared truths</span>
        </div>
        <div className="counter">
          voices shared
          <strong>{thoughts.length}</strong>
        </div>
      </header>

      {/* Centre tagline — fades when sky is full */}
      {thoughts.length < 10 && (
        <div className="tagline" aria-hidden>
          <h1>Every star<br />carries <em>a voice</em><br />the world couldn't hear.</h1>
        </div>
      )}

      {/* Input panel */}
      <footer>
        <p className="hint">share your one sentence — anonymously</p>
        <div className="input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={140}
            placeholder="I feel like I'm holding everything together, alone…"
            disabled={submitting}
            aria-label="Share your anonymous thought"
          />
          <button onClick={handleSubmit} disabled={submitting || !input.trim()}>
            {submitting ? '…' : 'Release'}
          </button>
        </div>
        <p className="privacy-note">no names · no accounts · no judgment</p>
        {isMobile && <p className="privacy-note" style={{marginTop: 2}}>tap any star to read it</p>}
      </footer>

      {/* Toast */}
      {toast && (
        <div className="toast">
          {toast === 'added' ? (
            <><p>Your light joins the sky.</p><small>You are not alone</small></>
          ) : (
            <><p>Your thought was received.</p><small>It will appear shortly after a quick review</small></>
          )}
        </div>
      )}

      <style jsx>{`
        .root {
          position: fixed; inset: 0;
          overflow: hidden;
        }
        .bg-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .bg-star {
          position: absolute; border-radius: 50%; background: #d8c0e8;
          animation: twinkle var(--dur, 4s) ease-in-out infinite var(--delay, 0s);
        }
        @keyframes twinkle {
          0%,100% { opacity: var(--lo, 0.05); transform: scale(1); }
          50%      { opacity: var(--hi, 0.2); transform: scale(1.4); }
        }
        .connections { position: fixed; inset: 0; pointer-events: none; z-index: 1; width: 100%; height: 100%; }

        /* Stars */
        .star {
          position: fixed; width: 8px; height: 8px; border-radius: 50%;
          background: #d8b8e8; cursor: pointer;
          transform: translate(-50%, -50%) scale(0);
          animation: appear 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transition: transform 0.4s, box-shadow 0.3s, background 0.3s;
          z-index: 10;
        }
        @media (max-width: 600px) {
          .star { width: 11px; height: 11px; } /* bigger touch target on mobile */
        }
        @keyframes appear {
          from { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          to   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        .star:hover, .star:active {
          transform: translate(-50%,-50%) scale(2.4);
          box-shadow: 0 0 18px 6px rgba(232,160,176,0.55);
          background: #e8a0b0;
        }
        .star.fresh {
          background: #f4b8c8;
          box-shadow: 0 0 22px 7px rgba(244,184,200,0.65);
        }

        /* Tooltip */
        .tip {
          position: fixed; z-index: 100;
          max-width: 240px; min-width: 180px;
          background: rgba(26,18,32,0.92);
          border: 1px solid rgba(240,232,240,0.12);
          backdrop-filter: blur(14px);
          border-radius: 6px; padding: 14px 16px 10px;
          pointer-events: auto;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform:none; } }
        .tip p {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-weight: 300;
          font-size: 0.98rem; line-height: 1.55;
          color: #f0e8f0; margin-bottom: 10px;
        }
        .flag-btn {
          background: none; border: 1px solid rgba(240,232,240,0.15);
          border-radius: 3px; padding: 4px 10px;
          font-family: 'Jost', sans-serif; font-size: 0.6rem;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(240,232,240,0.35); cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .flag-btn:hover { color: #e8a0b0; border-color: #e8a0b0; }
        .flag-confirm { font-size: 0.6rem; letter-spacing: 0.15em; color: #b8a4c8; }

        /* Header */
        header {
          position: fixed; top: 0; left: 0; right: 0;
          padding: clamp(20px, 5vw, 36px) clamp(20px, 6vw, 48px) 20px;
          display: flex; justify-content: space-between; align-items: flex-start;
          z-index: 50;
          background: linear-gradient(to bottom, rgba(26,18,32,0.92) 0%, transparent 100%);
        }
        .wordmark {
          font-family: 'Cormorant Garamond', serif; font-weight: 300;
          font-size: clamp(0.8rem, 2.5vw, 1.05rem);
          letter-spacing: 0.16em; text-transform: uppercase;
          color: #f0e8f0; opacity: 0.72; line-height: 1.5;
        }
        .wordmark span {
          display: block; font-style: italic; font-size: 0.68rem;
          letter-spacing: 0.24em; opacity: 0.5; margin-top: 3px;
        }
        .counter {
          font-size: 0.65rem; letter-spacing: 0.22em;
          text-transform: uppercase; color: #b8a4c8;
          text-align: right; opacity: 0.7; line-height: 1.8;
        }
        .counter strong {
          display: block; font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.4rem, 4vw, 1.9rem);
          font-weight: 300; color: #f0e8f0; letter-spacing: 0.05em;
        }

        /* Tagline */
        .tagline {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center; pointer-events: none; z-index: 2;
        }
        .tagline h1 {
          font-family: 'Cormorant Garamond', serif; font-weight: 300;
          font-size: clamp(1.3rem, 4vw, 2.6rem);
          letter-spacing: 0.04em; line-height: 1.4;
          color: #f0e8f0; opacity: 0.16;
        }
        .tagline h1 em { font-style: italic; color: #f0c090; }

        /* Footer / input */
        footer {
          position: fixed; bottom: 0; left: 0; right: 0;
          padding: clamp(16px, 4vw, 28px) clamp(16px, 6vw, 48px) clamp(20px, 5vw, 40px);
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          z-index: 50;
          background: linear-gradient(to top, rgba(26,18,32,0.95) 0%, transparent 100%);
        }
        .hint {
          font-size: 0.65rem; letter-spacing: 0.22em;
          text-transform: uppercase; color: #b8a4c8; opacity: 0.55;
        }
        .input-row {
          display: flex; width: 100%; max-width: 560px; gap: 10px;
        }
        input {
          flex: 1; background: rgba(240,232,240,0.05);
          border: 1px solid rgba(240,232,240,0.12); border-radius: 3px;
          padding: clamp(10px, 2vw, 14px) 18px;
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          font-size: clamp(0.9rem, 2.5vw, 1.05rem); font-weight: 300;
          color: #f0e8f0; outline: none;
          transition: border-color 0.3s, background 0.3s;
          backdrop-filter: blur(8px);
          -webkit-appearance: none;
        }
        input::placeholder { color: rgba(240,232,240,0.22); }
        input:focus {
          border-color: rgba(232,160,176,0.38);
          background: rgba(240,232,240,0.08);
        }
        button {
          background: transparent;
          border: 1px solid rgba(240,232,240,0.18); border-radius: 3px;
          padding: clamp(10px,2vw,14px) clamp(16px,3vw,24px);
          font-family: 'Jost', sans-serif; font-weight: 300;
          font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase;
          color: #f0e8f0; cursor: pointer; white-space: nowrap;
          transition: background 0.3s, border-color 0.3s, color 0.3s;
        }
        button:hover:not(:disabled) {
          background: rgba(232,160,176,0.12);
          border-color: rgba(232,160,176,0.4);
          color: #e8a0b0;
        }
        button:disabled { opacity: 0.4; cursor: default; }
        .privacy-note {
          font-size: 0.58rem; letter-spacing: 0.17em;
          text-transform: uppercase; color: rgba(240,232,240,0.18);
        }

        /* Toast */
        .toast {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(26,18,32,0.92);
          border: 1px solid rgba(232,160,176,0.25);
          border-radius: 6px; padding: 22px 36px;
          text-align: center; z-index: 200;
          backdrop-filter: blur(16px);
          animation: fadeIn 0.35s ease;
          pointer-events: none;
        }
        .toast p {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-size: 1.1rem;
          color: #e8a0b0; margin-bottom: 5px;
        }
        .toast small {
          font-size: 0.62rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(240,232,240,0.32);
        }
      `}</style>
    </div>
  )
}
