import { useRef } from 'react'
import { motion } from 'framer-motion'

export default function AboutSection() {
 const ref = useRef<HTMLDivElement>(null)

 return (
 <section
 id="about"
 ref={ref}
 className="bg-black pt-32 md:pt-44 pb-10 md:pb-14 px-6 overflow-hidden"
 style={{
 background: 'radial-gradient(ellipse_at_top, rgba(255,255,255,0.03) 0%, transparent 70%)',
 }}
 >
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: '-100px' }}
 transition={{ duration: 0.6 }}
 className="max-w-6xl mx-auto"
 >
 <p
 className="text-white/40 text-sm tracking-widest uppercase mb-6"
 style={{ fontFamily: "'Instrument Serif', serif" }}
 >
 About Us
 </p>
 </motion.div>

 <motion.h2
 initial={{ opacity: 0, y: 40 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: '-100px' }}
 transition={{ duration: 0.8, delay: 0.1 }}
 className="max-w-6xl mx-auto text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight"
 style={{ fontFamily: "'Instrument Serif', serif" }}
 >
 Pioneering{' '}
 <em className="italic text-white/60">ideas</em>
 <br className="hidden md:block" />
 <em className="italic text-white/60">
 minds that then create, build, and inspire.
 </em>
 </motion.h2>
 </section>
 )
}
