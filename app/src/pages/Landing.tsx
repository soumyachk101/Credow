import { Link } from 'react-router-dom'
import { ArrowRight, Shield, TrendingUp, Globe2, Users } from 'lucide-react'

export default function Landing() {
 return (
 <div className="min-h-screen bg-white dark:bg-slate-900">
 {/* Navigation */}
 <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
 <span className="text-white font-bold text-sm">CF</span>
 </div>
 <span className="text-xl font-bold text-gray-900 dark:text-white">
 CreditFlow
 </span>
 </div>
 <Link
 to="/onboarding"
 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 Get Started
 </Link>
 </div>
 </nav>

 {/* Hero Section */}
 <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
 <div className="text-center">
 <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
 <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
 API Credits,
 </span>
 <br />
 <span className="text-gray-900 dark:text-white">Reinvented</span>
 </h1>
 <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto mb-8">
 Optimize your corporate API budget with intelligent credit allocation,
 transparent yield distribution, and native x402 payment settlement on Algorand.
 </p>
 <div className="flex flex-col sm:flex-row gap-4 justify-center">
 <Link
 to="/onboarding"
 className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 Get Started
 <ArrowRight className="w-4 h-4" />
 </Link>
 <a
 href="#how-it-works"
 className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
 >
 Learn More
 </a>
 </div>
 </div>
 </section>

 {/* How It Works */}
 <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
 <div className="text-center mb-16">
 <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
 How It Works
 </h2>
 <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
 Three simple steps to transform how your company manages API credits.
 </p>
 </div>

 <div className="grid md:grid-cols-3 gap-8">
 {[
 {
 step: '01',
 title: 'Buy Credits',
 description: 'Purchase API credit pools and allocate them across teams and employees with full budget visibility.',
 },
 {
 step: '02',
 title: 'Allocate & Consume',
 description: 'Managers distribute credits to teams. Employees claim credits for API service consumption via x402.',
 },
 {
 step: '03',
 title: 'Earn Yield',
 description: 'Unclaimed credits automatically earn yield through Algorand smart contracts — shared between company and employees.',
 },
 ].map((item) => (
 <div key={item.step} className="relative">
 <div className="text-6xl font-bold text-blue-100 dark:text-blue-900/30 mb-4">
 {item.step}
 </div>
 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
 {item.title}
 </h3>
 <p className="text-gray-600 dark:text-slate-300">
 {item.description}
 </p>
 </div>
 ))}
 </div>
 </section>

 {/* Key Benefits */}
 <section className="bg-gray-50 dark:bg-slate-800/30 py-20">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="text-center mb-16">
 <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
 Why CreditFlow
 </h2>
 <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
 Built for the modern enterprise — where every API credit works harder.
 </p>
 </div>

 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 {
 icon: Shield,
 title: 'Not Payroll',
 description: 'Credits are budget allocations, not salaries. No payroll complications or tax liabilities.',
 },
 {
 icon: TrendingUp,
 title: 'Idle Yield',
 description: 'Unclaimed credits earn yield automatically through Algorand DeFi protocols.',
 },
 {
 icon: Globe2,
 title: 'x402 Native',
 description: 'Native HTTP 402 payment protocol. Settle API bills on-chain with full transparency.',
 },
 {
 icon: Users,
 title: 'Team Visibility',
 description: 'Real-time dashboards for managers. Track allocation, consumption, and yield at a glance.',
 },
 ].map((benefit) => (
 <div key={benefit.title} className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700/60 shadow-sm">
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
 <benefit.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
 </div>
 <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
 {benefit.title}
 </h3>
 <p className="text-sm text-gray-600 dark:text-slate-300">
 {benefit.description}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* CTA Section */}
 <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
 <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center">
 <h2 className="text-3xl font-bold text-white mb-4">
 Ready to optimize your API credits?
 </h2>
 <p className="text-blue-100 mb-8 max-w-xl mx-auto">
 Get started in minutes. Create your company, add your team, and start earning yield on every credit.
 </p>
 <Link
 to="/onboarding"
 className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
 >
 Get Started
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </section>

 {/* Footer */}
 <footer className="border-t border-gray-200 dark:border-slate-700/60 py-12">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center">
 <span className="text-white font-bold text-xs">CF</span>
 </div>
 <span className="text-sm font-semibold text-gray-900 dark:text-white">
 CreditFlow
 </span>
 </div>
 <div className="flex gap-6">
 <Link to="/dashboard" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
 Dashboard
 </Link>
 <Link to="/allocations" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
 Allocations
 </Link>
 <Link to="/yield" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
 Yield
 </Link>
 <Link to="/claims" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
 Claims
 </Link>
 </div>
 <p className="text-sm text-gray-400 dark:text-slate-500">
 &copy; {new Date().getFullYear()} CreditFlow. All rights reserved.
 </p>
 </div>
 </div>
 </footer>
 </div>
 )
}
