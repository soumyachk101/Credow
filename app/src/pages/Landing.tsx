import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Globe, Share2, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import AboutSection from './AboutSection'
import FeaturedVideoSection from './FeaturedVideoSection'
import PhilosophySection from './PhilosophySection'
import ServicesSection from './ServicesSection'

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
 const [videoReady, setVideoReady] = useState(false)

 useEffect(() => {
 const video = videoRef.current
 if (!video) return

 const onCanPlay = () => {
 setVideoReady(true)
 video.play().catch(() => {})
 fadeVideo(video, 1, 500)
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
 video.play().then(() => fadeVideo(video, 1, 500)).catch(() => {})
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
 <div className="min-h-screen bg-black text-white">
 {/* ══════════════════════════════════════════════════════════
 HERO SECTION
 ══════════════════════════════════════════════════════════ */}
 <section className="relative min-h-screen overflow-hidden flex flex-col">
 {/* Background Video */}
 <video
 ref={videoRef}
 className="absolute inset-0 w-full h-full object-cover object-bottom"
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

 {/* Dark overlay for readability */}
 <div className="absolute inset-0 bg-black/40" />

 {/* Navbar */}
 <nav className="relative z-20 px-6 py-6">
 <div className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
 {/* Left */}
 <div className="flex items-center gap-8">
 <Link to="/" className="flex items-center gap-2">
 <Globe className="w-6 h-6 text-white" />
 <span className="text-white font-semibold text-lg">CreditFlow</span>
 </Link>
 <div className="hidden md:flex items-center gap-8 ml-8">
 <a href="#philosophy" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Features</a>
 <a href="#services" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Pricing</a>
 <a href="#about" className="text-white/80 hover:text-white text-sm font-medium transition-colors">About</a>
 </div>
 </div>
 {/* Right */}
 <div className="flex items-center gap-3">
 <Link to="/onboarding" className="text-white text-sm font-medium hover:text-white/80 transition-colors">
 Sign Up
 </Link>
 <Link to="/onboarding" className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors">
 Login
 </Link>
 </div>
 </div>
 </nav>

 {/* Hero Content */}
 <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
 <motion.h1
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8 }}
 className="text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap"
 style={{ fontFamily: "'Instrument Serif', serif" }}
 >
 Know it then <em className="italic">all</em>
 </motion.h1>

 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8, delay: 0.2 }}
 className="mt-8 max-w-xl w-full"
 >
 <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
 <input
 type="email"
 placeholder="Enter your email"
 className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm outline-none"
 />
 <button className="bg-white rounded-full p-3 text-black hover:bg-white/90 transition-colors">
 <ArrowRight className="w-5 h-5" />
 </button>
 </div>
 </motion.div>

 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.8, delay: 0.4 }}
 className="mt-6 text-white text-sm leading-relaxed px-4 max-w-lg"
 >
 Stay updated with the latest news and insights. Subscribe to our newsletter today and never miss out on exciting updates.
 </motion.p>

 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.8, delay: 0.6 }}
 className="mt-8"
 >
 <Link
 to="/onboarding"
 className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors inline-block"
 >
 Manifesto
 </Link>
 </motion.div>
 </div>

 {/* Social Icons Footer */}
 <div className="relative z-10 flex justify-center gap-4 pb-12">
 {[
 { icon: Share2, label: 'Share' },
 { icon: Mail, label: 'Email' },
 { icon: Globe, label: 'Globe' },
 ].map(({ icon: Icon, label }) => (
 <button
 key={label}
 className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all"
 aria-label={label}
 >
 <Icon className="w-5 h-5" />
 </button>
 ))}
 </div>
 </section>

 {/* ══════════════════════════════════════════════════════════
 ABOUT SECTION
 ══════════════════════════════════════════════════════════ */}
 <AboutSection />

 {/* ══════════════════════════════════════════════════════════
 FEATURED VIDEO SECTION
 ══════════════════════════════════════════════════════════ */}
 <FeaturedVideoSection />

 {/* ══════════════════════════════════════════════════════════
 PHILOSOPHY SECTION
 ══════════════════════════════════════════════════════════ */}
 <PhilosophySection />

 {/* ══════════════════════════════════════════════════════════
 SERVICES SECTION
 ══════════════════════════════════════════════════════════ */}
 <ServicesSection />
 </div>
 )
}
