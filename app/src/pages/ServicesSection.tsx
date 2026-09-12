import { motion } from 'framer-motion'

export default function ServicesSection() {
 const services = [
 {
 title: 'Strategic Advisory',
 desc: 'Deep-dive consulting that uncovers where real value is hiding in your business model.',
 },
 {
 title: 'Product Design',
 desc: 'Interfaces and systems built with intent — not convention.',
 },
 {
 title: 'Creative Development',
 desc: 'Bespoke engineering that translates ambition into production-grade products.',
 },
 {
 title: 'Brand Narrative',
 desc: 'Stories that shape perception and build lasting connections with your audience.',
 },
 ]

 return (
 <section
 id="services"
 className="bg-black py-28 md:py-40 px-6 overflow-hidden"
 style={{
 background: 'radial-gradient(ellipse_at_bottom, rgba(255,255,255,0.03) 0%, transparent 70%)',
 }}
 >
 <motion.div
 initial={{ opacity: 0, y: 40 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: '-100px' }}
 transition={{ duration: 0.8 }}
 className="max-w-6xl mx-auto mb-16 md:mb-24"
 >
 <p className="text-white/40 text-sm tracking-widest uppercase mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
 Our Services
 </p>
 <h2 className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
 What we <em className="italic text-white/40">do</em>
 </h2>
 </motion.div>

 <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
 {services.map((service, i) => (
 <motion.div
 key={service.title}
 initial={{ opacity: 0, y: 40 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: '-80px' }}
 transition={{ duration: 0.7, delay: i * 0.1 }}
 className="group"
 >
 <div className="liquid-glass rounded-3xl p-8 md:p-10 h-full flex flex-col justify-between hover:bg-white/[0.02] transition-colors duration-500">
 <div>
 <p className="text-white/30 text-xs tracking-widest uppercase mb-4">
 {String(i + 1).padStart(2, '0')}
 </p>
 <h3 className="text-2xl md:text-3xl text-white mb-4 tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
 {service.title}
 </h3>
 <p className="text-white/50 text-sm leading-relaxed">{service.desc}</p>
 </div>

 <div className="mt-8">
 <button className="liquid-glass rounded-full px-6 py-2 text-white/70 text-xs tracking-widest uppercase hover:text-white hover:bg-white/5 transition-all group-hover:translate-x-1 transition-transform duration-300">
 Explore
 </button>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 </section>
 )
}
