import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Shield,
  Zap,
  Vault,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import AboutSection from './AboutSection'
import FeaturedVideoSection from './FeaturedVideoSection'
import PhilosophySection from './PhilosophySection'
import ServicesSection from './ServicesSection'
import FaqSection from './FaqSection'

const fadeVideo = (
  el: HTMLVideoElement | null,
  to: number,
  duration = 500
): void => {
  if (!el) return
  const start = performance.now()
  const from = parseFloat(el.style.opacity || '1')
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    el.style.opacity = String(from + (to - from) * progress)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export default function Landing() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [, setVideoReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onCanPlay = () => {
      setVideoReady(true)
      video.play().catch(() => {})
      fadeVideo(video, 0.45, 500)
    }

    const onTimeUpdate = () => {
      if (video.duration - video.currentTime <= 0.55) {
        fadeVideo(video, 0, 500)
      }
    }

    const onEnded = () => {
      video.style.opacity = '0'
      setTimeout(() => {
        video.currentTime = 0
        video.play().then(() => fadeVideo(video, 0.45, 500)).catch(() => {})
      }, 100)
    }

    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ══════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen overflow-hidden flex flex-col justify-between">
        {/* Background Video with Cinematic Dark Treatment */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{ opacity: 0 }}
          muted
          autoPlay
          playsInline
          preload="auto"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
            type="video/mp4"
          />
        </video>

        {/* Multi-layered dark & radial glow overlay */}
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black pointer-events-none" />

        {/* Navbar */}
        <header className="relative z-20 px-6 py-6">
          <nav className="liquid-glass rounded-full max-w-6xl mx-auto px-6 py-3 flex items-center justify-between border border-white/10">
            {/* Left: Brand & Status */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black font-bold text-base shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  C
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-base tracking-tight leading-none">
                    Credow
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 tracking-wider flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Algorand TestNet
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="hidden lg:flex items-center gap-6 ml-6">
                <a
                  href="#features"
                  className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium transition-colors"
                >
                  x402 Protocol
                </a>
                <a
                  href="#yield-vault"
                  className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium transition-colors"
                >
                  Yield Vault
                </a>
                <a
                  href="#architecture"
                  className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium transition-colors"
                >
                  Architecture
                </a>
                <a
                  href="#faq"
                  className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium transition-colors"
                >
                  FAQ
                </a>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/onboarding"
                className="hidden sm:inline-block text-white/80 hover:text-white text-xs uppercase tracking-wider font-medium px-4 py-2 transition-colors"
              >
                Onboarding
              </Link>
              <Link
                to="/dashboard"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full px-5 py-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center gap-1.5"
              >
                <span>Launch App</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20 text-center max-w-5xl mx-auto">
          {/* Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Over $1T in Dead Corporate Allowances — Re-Engineered on Algorand</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight leading-[1.08] max-w-5xl font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Turn Unspent Budgets into{' '}
            <em className="italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300">
              Yield-Bearing Capital
            </em>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-white/70 text-base sm:text-lg md:text-xl max-w-3xl leading-relaxed font-normal"
          >
            Credow powers corporate credit allowances on <strong>Algorand</strong> using native <strong>Circle USDC</strong>. Employees claim credits through instant <strong>x402 micropayments</strong> — while unclaimed funds compound in an on-chain vault with a <strong>70% company treasury / 30% employee bonus</strong> yield split.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link
              to="/dashboard"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full px-8 py-3.5 text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Launch Credow App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/claims"
              className="w-full sm:w-auto liquid-glass hover:bg-white/10 text-white font-medium rounded-full px-8 py-3.5 text-sm uppercase tracking-wider border border-white/15 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Interactive x402 Demo</span>
            </Link>

            <Link
              to="/onboarding"
              className="w-full sm:w-auto text-white/70 hover:text-white text-xs uppercase tracking-wider font-medium px-6 py-3.5 transition-colors"
            >
              Setup Organization &rarr;
            </Link>
          </motion.div>
        </div>

        {/* Live Metrics Ticker Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 px-6 pb-10"
        >
          <div className="liquid-glass rounded-3xl max-w-5xl mx-auto p-6 grid grid-cols-2 md:grid-cols-4 gap-6 border border-white/10">
            <div className="text-center md:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">2.8s</div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Block Finality</div>
              <div className="text-[11px] text-white/30 mt-0.5">Instant deterministic settlement</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">&lt;$0.001</div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Average Fee</div>
              <div className="text-[11px] text-white/30 mt-0.5">Micro-claims are economically viable</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">70 / 30</div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Mutual Yield Split</div>
              <div className="text-[11px] text-white/30 mt-0.5">70% Treasury · 30% Employee bonus</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">ARC-56</div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Smart Contract</div>
              <div className="text-[11px] text-white/30 mt-0.5">PuyaTs TEAL · ASA #10458941</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BENTO FEATURES SECTION
      ══════════════════════════════════════════════════════════ */}
      <AboutSection />

      {/* ══════════════════════════════════════════════════════════
          x402 PROTOCOL & EXECUTION TERMINAL
      ══════════════════════════════════════════════════════════ */}
      <FeaturedVideoSection />

      {/* ══════════════════════════════════════════════════════════
          YIELD VAULT & 70/30 CALCULATOR
      ══════════════════════════════════════════════════════════ */}
      <PhilosophySection />

      {/* ══════════════════════════════════════════════════════════
          ARCHITECTURE & ENTERPRISE ROLES
      ══════════════════════════════════════════════════════════ */}
      <ServicesSection />

      {/* ══════════════════════════════════════════════════════════
          FAQ SECTION
      ══════════════════════════════════════════════════════════ */}
      <FaqSection />

      {/* ══════════════════════════════════════════════════════════
          ENTERPRISE FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 bg-black/90 py-16 px-6 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold text-sm">
                C
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">Credow</span>
            </div>
            <p className="text-xs text-white/50 max-w-sm leading-relaxed">
              Enterprise corporate credit allocation platform powered by Algorand, x402 micropayments, and autonomous yield vaults.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-emerald-400/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Algod: testnet-api.4160.nodely.dev | USDC ASA: 10458941</span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <div className="text-white font-medium uppercase tracking-wider mb-3">Platform</div>
              <ul className="space-y-2 text-white/60">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/claims" className="hover:text-white transition-colors">Claims & x402</Link></li>
                <li><Link to="/yield" className="hover:text-white transition-colors">Yield Vault</Link></li>
                <li><Link to="/allocations" className="hover:text-white transition-colors">Allocations</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-white font-medium uppercase tracking-wider mb-3">Organization</div>
              <ul className="space-y-2 text-white/60">
                <li><Link to="/onboarding" className="hover:text-white transition-colors">Onboarding Wizard</Link></li>
                <li><Link to="/teams" className="hover:text-white transition-colors">Teams</Link></li>
                <li><Link to="/employees" className="hover:text-white transition-colors">Employees</Link></li>
                <li><Link to="/companies" className="hover:text-white transition-colors">Companies</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-white font-medium uppercase tracking-wider mb-3">Algorand Resources</div>
              <ul className="space-y-2 text-white/60">
                <li>
                  <a
                    href="https://lora.algokit.io/testnet"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>Lora Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>Circle USDC Faucet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://bank.testnet.algorand.network/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>TestNet Dispenser</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
          <div>&copy; {new Date().getFullYear()} Credow. Built on Algorand for Enterprise Credit Efficiency.</div>
          <div className="flex items-center gap-4">
            <span>RFC 9110 x402 Native</span>
            <span>&bull;</span>
            <span>ARC-56 PuyaTs Contract</span>
            <span>&bull;</span>
            <span>70/30 Yield Split</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
