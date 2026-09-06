import React, { Suspense, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CalendarCheck, CheckCircle2, MessageCircle,
  Scale, Search, ShieldCheck, Sparkles, Star, UsersRound,
  Bot, Zap, Globe, Gavel, FileText, Video, CreditCard,
  TrendingUp, Users, Award, Briefcase, UserCheck, Activity
} from 'lucide-react'
import { Badge, Button, Card, AnimatedSection } from '../components/UI'
import { publicAPI } from '../services/api'

const Hero3DScene = React.lazy(() => import('../components/3D/Hero3DScene'))

/* ── Animation presets ──────────────────────────────── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const Home = () => {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  /* ── Real-time stats from database ─────────────── */
  const [platformStats, setPlatformStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await publicAPI.getStats()
        if (res.data?.success) {
          setPlatformStats(res.data.data)
        }
      } catch (err) {
        console.error('Failed to load platform stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  /* ── Derived values from live data ──────────────── */
  const totalLawyers = platformStats?.totalLawyers || 0
  const totalClients = platformStats?.totalClients || 0
  const completedAppointments = platformStats?.completedAppointments || 0
  const avgRating = platformStats?.averageRating || 0
  const totalReviews = platformStats?.totalReviews || 0
  const clientSatisfaction = platformStats?.clientSatisfaction || 0
  const lawyerLevels = platformStats?.lawyerLevels || {}
  const topReviews = platformStats?.topReviews || []
  const topLawyers = platformStats?.topLawyers || []

  const stats = [
    { value: totalLawyers, label: 'Verified Lawyers', icon: UsersRound, suffix: '+' },
    { value: completedAppointments, label: 'Successful Appointments', icon: CheckCircle2, suffix: '+' },
    { value: totalClients, label: 'Registered Clients', icon: Users, suffix: '+' },
    { value: clientSatisfaction, label: 'Client Satisfaction', icon: Star, suffix: '%' },
  ]

  const capabilities = [
    {
      icon: Search, title: 'Smart Discovery',
      description: 'Find the right lawyer using intelligent filters — specialization, availability, fees, and verified trust signals.',
      gradient: 'from-primary-500 to-primary-700',
    },
    {
      icon: Bot, title: 'AI Guidance',
      description: 'Receive structured preliminary guidance before booking, so every consultation begins with full context.',
      gradient: 'from-accent-500 to-accent-700',
    },
    {
      icon: CalendarCheck, title: 'Secure Booking',
      description: 'Book consultations with chat & video options, transparent appointment states, and effortless follow-up.',
      gradient: 'from-info-500 to-info-700',
    },
    {
      icon: ShieldCheck, title: 'Verified Experts',
      description: 'Every profile is verification-backed, letting you make decisions with confidence and complete transparency.',
      gradient: 'from-success-500 to-success-700',
    },
  ]

  const steps = [
    { num: '01', title: 'Describe your legal need', text: 'Start with AI or search directly. Share your situation in plain language.', icon: MessageCircle },
    { num: '02', title: 'Match with the right lawyer', text: 'Compare verified profiles, rates, and specializations at a glance.', icon: Search },
    { num: '03', title: 'Consult and resolve', text: 'Book, chat, and manage everything in one seamless workflow.', icon: CalendarCheck },
  ]

  /* ── Animated counter component ─────────────────── */
  const AnimatedCounter = ({ value, suffix = '' }) => {
    const [display, setDisplay] = useState(0)
    useEffect(() => {
      if (!value) return
      const target = typeof value === 'number' ? value : parseInt(value) || 0
      if (target === 0) return
      const duration = 2000
      const steps = 60
      const increment = target / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setDisplay(target)
          clearInterval(timer)
        } else {
          setDisplay(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }, [value])
    return <>{display.toLocaleString()}{suffix}</>
  }

  /* ── Level icon/color mapping ───────────────────── */
  const levelConfig = {
    Senior: { icon: Award, color: 'text-accent-400', bg: 'bg-accent-500/15', label: 'Senior' },
    Intermediate: { icon: Briefcase, color: 'text-primary-400', bg: 'bg-primary-500/15', label: 'Intermediate' },
    Junior: { icon: UserCheck, color: 'text-info-400', bg: 'bg-info-500/15', label: 'Junior' },
    Fresher: { icon: Activity, color: 'text-success-400', bg: 'bg-success-500/15', label: 'Fresher' },
  }

  return (
    <div className="overflow-hidden">

      {/* ════════════════════════════════════════════════
          HERO SECTION — Full-bleed with 3D background
      ════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#064e3b] to-[#0f172a]" />

        {/* 3D Scene as full background */}
        <Suspense fallback={null}>
          <Hero3DScene />
        </Suspense>

        {/* Animated gradient orbs */}
        <motion.div
          className="pointer-events-none absolute -left-40 top-1/4 h-[350px] w-[350px] rounded-full bg-primary-600/15 blur-[100px]"
          animate={{ y: [-15, 20, -15], x: [-8, 15, -8] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -right-32 top-1/3 h-[280px] w-[280px] rounded-full bg-accent-500/10 blur-[80px]"
          animate={{ y: [15, -18, 15], x: [10, -10, 10] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-0 left-1/3 h-[200px] w-[200px] rounded-full bg-primary-400/8 blur-[60px]"
          animate={{ y: [8, -15, 8] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* Radial glow center */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 container-custom py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">

            {/* LEFT — Copy */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp}>
                <Badge variant="primary-outline" className="!border-primary-400/30 !bg-primary-500/10 !text-primary-300 backdrop-blur-sm" icon={Zap}>
                  Punjab's #1 Legal Platform
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
                Find Trusted Lawyers.{' '}
                <span className="bg-gradient-to-r from-primary-300 via-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Get AI-Powered Guidance.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="max-w-lg text-base leading-relaxed text-secondary-300/90 sm:text-lg">
                LegalMate connects you with {totalLawyers > 0 ? `${totalLawyers}+` : ''} verified lawyers, AI-assisted preparation, and secure video consultations — all in one modern platform.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Link to="/search">
                  <button className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-secondary-900 shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] hover:scale-[1.02]">
                    Find a Lawyer
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>
                <button
                  onClick={() => window.dispatchEvent(new Event('open-floating-chatbot'))}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/30"
                >
                  <Bot className="h-4 w-4 text-primary-400" />
                  Ask AI Assistant
                </button>
              </motion.div>

              {/* Mini stats */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 pt-2">
                {[
                  { icon: Users, label: `${totalLawyers}+ Lawyers` },
                  { icon: Star, label: `${avgRating || '...'}/5 Rating` },
                  { icon: ShieldCheck, label: 'Verified Profiles' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-secondary-400">
                    <item.icon className="h-4 w-4 text-primary-400" />
                    {item.label}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT — Platform showcase cards */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
            >
              {/* Main dashboard mockup card */}
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-xl">
                {/* Top bar */}
                <div className="flex items-center gap-1.5 mb-3 px-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-error-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-accent-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success-400/60" />
                  <div className="ml-3 h-5 flex-1 rounded-md bg-white/5" />
                </div>

                {/* Dashboard-like content */}
                <div className="space-y-2.5">
                  {/* Stat cards row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Appointments', value: completedAppointments || '—', icon: FileText, color: 'primary' },
                      { label: 'Clients', value: totalClients || '—', icon: TrendingUp, color: 'accent' },
                      { label: 'Rating', value: avgRating ? `${avgRating}★` : '—', icon: Star, color: 'success' },
                    ].map((card) => (
                      <div key={card.label} className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5">
                        <card.icon className={`h-3.5 w-3.5 mb-1 text-${card.color}-400`} />
                        <p className="text-sm font-bold text-white">{card.value}</p>
                        <p className="text-[10px] text-secondary-400">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Lawyer cards */}
                  <div className="space-y-2">
                    {(topLawyers.length > 0 ? topLawyers : [
                      { name: 'Loading...', specialization: '—', rating: '—', fee: '—', available: false },
                    ]).map((lawyer, idx) => (
                      <div key={lawyer.name || idx} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 transition-all duration-300 hover:bg-white/[0.07]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/30 to-primary-700/30">
                          <Gavel className="h-3.5 w-3.5 text-primary-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{lawyer.name}</p>
                          <p className="text-[10px] text-secondary-400">{lawyer.specialization}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-semibold text-accent-400">{lawyer.fee}</p>
                          <div className="flex items-center gap-0.5 justify-end">
                            <Star className="h-2.5 w-2.5 text-accent-400 fill-accent-400" />
                            <span className="text-[10px] text-secondary-400">{lawyer.rating}</span>
                          </div>
                        </div>
                        <div className={`h-2 w-2 shrink-0 rounded-full ${lawyer.available ? 'bg-success-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-secondary-500'}`} />
                      </div>
                    ))}
                  </div>

                  {/* Action row */}
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-primary-500/20 border border-primary-500/30 py-2 text-center text-[11px] font-bold text-primary-300">
                      <Video className="inline h-3 w-3 mr-1" />Video Consult
                    </div>
                    <div className="flex-1 rounded-lg bg-accent-500/20 border border-accent-500/30 py-2 text-center text-[11px] font-bold text-accent-300">
                      <CreditCard className="inline h-3 w-3 mr-1" />Secure Payment
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-6 top-10"
              >
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-secondary-900/80 px-3 py-2 backdrop-blur-xl shadow-lg">
                  <div className="h-7 w-7 rounded-full bg-success-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Verified</p>
                    <p className="text-[9px] text-secondary-400">{totalLawyers}+ Lawyers</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 bottom-14"
              >
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-secondary-900/80 px-3 py-2 backdrop-blur-xl shadow-lg">
                  <div className="h-7 w-7 rounded-full bg-accent-500/20 flex items-center justify-center">
                    <Star className="h-3.5 w-3.5 text-accent-400 fill-accent-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{avgRating || '...'} Rating</p>
                    <p className="text-[9px] text-secondary-400">{totalReviews}+ Reviews</p>
                  </div>
                </div>
              </motion.div>

              {/* AI badge top right */}
              <motion.div
                animate={{ y: [-4, 5, -4] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-3 top-3"
              >
                <div className="flex items-center gap-1.5 rounded-lg border border-primary-500/30 bg-primary-900/60 px-2.5 py-1.5 backdrop-blur-xl">
                  <Sparkles className="h-3 w-3 text-primary-400" />
                  <span className="text-[10px] font-bold text-primary-300">AI Powered</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════
          STATS BAR — Real-time from database
      ════════════════════════════════════════════════ */}
      <section className="relative bg-secondary-900 border-t border-white/5">
        <div className="container-custom py-14">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/15">
                  <s.icon className="h-5 w-5 text-primary-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">
                  {loading ? '...' : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-secondary-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          LAWYER CATEGORIES — Senior / Intermediate / Junior / Fresher
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="primary-outline" icon={UsersRound}>Our Legal Team</Badge>
            <h2 className="mt-4 text-3xl font-bold text-secondary-900 md:text-4xl">
              Lawyers by Experience Level
            </h2>
            <p className="mt-4 text-secondary-600 max-w-xl mx-auto">
              Our platform has {totalLawyers} verified lawyers across all experience levels, ready to help with your legal needs.
            </p>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {['Senior', 'Intermediate', 'Junior', 'Fresher'].map((level, idx) => {
              const cfg = levelConfig[level]
              const Icon = cfg.icon
              const count = lawyerLevels[level] || 0
              return (
                <AnimatedSection key={level} preset="fadeUp" delay={idx * 0.1}>
                  <div className="group relative overflow-hidden rounded-2xl border border-secondary-100 bg-white p-7 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.bg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`h-7 w-7 ${cfg.color}`} />
                    </div>
                    <p className="text-4xl font-extrabold text-secondary-900">
                      {loading ? '...' : <AnimatedCounter value={count} />}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-secondary-700">{level} Lawyers</p>
                    <p className="mt-1 text-xs text-secondary-500">
                      {level === 'Senior' && '10+ years of experience'}
                      {level === 'Intermediate' && '5-10 years of experience'}
                      {level === 'Junior' && '2-5 years of experience'}
                      {level === 'Fresher' && 'Up to 2 years of experience'}
                    </p>
                    {/* Decorative gradient */}
                    <div className={`pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full ${cfg.bg} opacity-50 blur-2xl transition-all duration-300 group-hover:opacity-100`} />
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CAPABILITIES
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-[var(--surface-base)]">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="primary-outline" icon={Globe}>Core Capabilities</Badge>
            <h2 className="mt-4 text-3xl font-bold text-secondary-900 md:text-4xl">
              Everything you need, in one legal workflow
            </h2>
            <p className="mt-4 text-secondary-600 max-w-xl mx-auto">
              Built for trust, speed, and clarity — from first question to final consultation outcome.
            </p>
          </AnimatedSection>

          <div className="grid gap-6 md:grid-cols-2">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon
              return (
                <AnimatedSection key={cap.title} preset="fadeUp" delay={idx * 0.08}>
                  <Card hover className="group h-full">
                    <div className="flex items-start gap-5">
                      <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cap.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-secondary-900">{cap.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-secondary-600">{cap.description}</p>
                      </div>
                    </div>
                  </Card>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="info-outline" icon={Zap}>How It Works</Badge>
            <h2 className="mt-4 text-3xl font-bold text-secondary-900 md:text-4xl">
              Get legal help in three simple steps
            </h2>
          </AnimatedSection>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <AnimatedSection key={step.num} preset="fadeUp" delay={idx * 0.12}>
                  <div className="relative text-center group">
                    {/* Connecting line */}
                    {idx < steps.length - 1 && (
                      <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary-200 to-transparent" />
                    )}
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 shadow-soft transition-all duration-300 group-hover:shadow-medium group-hover:scale-105">
                      <Icon className="h-8 w-8" />
                    </div>
                    <span className="inline-block mb-2 text-xs font-bold text-primary-500 uppercase tracking-widest">Step {step.num}</span>
                    <h3 className="text-lg font-bold text-secondary-900">{step.title}</h3>
                    <p className="mt-2 text-sm text-secondary-600 max-w-xs mx-auto">{step.text}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TESTIMONIALS — Real reviews from database
      ════════════════════════════════════════════════ */}
      <section className="section-padding bg-[var(--surface-base)]">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="warning-outline" icon={Star}>Client Reviews</Badge>
            <h2 className="mt-4 text-3xl font-bold text-secondary-900 md:text-4xl">
              {totalReviews > 0 ? `${totalReviews}+ Reviews` : 'Client'} — Real Feedback from Our Clients
            </h2>
            <p className="mt-4 text-secondary-600 max-w-xl mx-auto">
              {avgRating > 0
                ? `Our platform maintains a ${avgRating}/5 average rating with ${clientSatisfaction}% client satisfaction.`
                : 'Hear what our clients have to say about their experience.'}
            </p>
          </AnimatedSection>

          {topReviews.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topReviews.map((review, idx) => (
                <AnimatedSection key={review.id || idx} preset="fadeUp" delay={idx * 0.1}>
                  <div className="h-full rounded-2xl border border-secondary-100 bg-white p-7 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
                    <div className="mb-4 flex items-center gap-1 text-accent-500">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={`${review.id}-${i}`} className="h-4 w-4 fill-current" />
                      ))}
                      {review.rating < 5 && [...Array(5 - review.rating)].map((_, i) => (
                        <Star key={`empty-${review.id}-${i}`} className="h-4 w-4 text-secondary-200" />
                      ))}
                    </div>
                    {review.comment ? (
                      <p className="text-sm leading-relaxed text-secondary-700 mb-6">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed text-secondary-400 italic mb-6">
                        Rated {review.rating}/5 stars
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-4 border-t border-secondary-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold">
                        {review.clientName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary-900 truncate">{review.clientName}</p>
                        <p className="text-xs text-secondary-500">Client</p>
                      </div>
                      {review.lawyerName && (
                        <div className="text-right">
                          <p className="text-[10px] text-secondary-400">Consulted</p>
                          <p className="text-xs font-semibold text-primary-600 truncate max-w-[120px]">{review.lawyerName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl border border-secondary-100 bg-white p-7 shadow-soft animate-pulse">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-4 w-4 rounded bg-secondary-100" />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-secondary-100" />
                    <div className="h-3 w-3/4 rounded bg-secondary-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════ */}
      <AnimatedSection preset="scaleUp">
        <section className="section-padding">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#020617] via-[#064e3b] to-[#0f172a] px-8 py-16 text-center text-white shadow-2xl sm:px-14 lg:py-24">
              {/* Glow orbs */}
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent-400/15 blur-[100px]" />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-96 rounded-full bg-primary-600/10 blur-[60px]" />

              <div className="relative">
                <Scale className="mx-auto mb-6 h-12 w-12 text-primary-400 opacity-60" />
                <h2 className="mx-auto max-w-2xl text-3xl font-extrabold md:text-4xl lg:text-5xl">
                  Ready to move your legal workflow forward?
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-secondary-300">
                  Join {totalClients > 0 ? `${totalClients}+` : ''} clients on LegalMate and work with verified professionals through a modern, high-trust platform.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link to="/register">
                    <button className="group flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-secondary-900 shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(16,185,129,0.25)] hover:scale-[1.02]">
                      Create Free Account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </Link>
                  <Link to="/search">
                    <button className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/30">
                      Browse Lawyers
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  )
}

export default Home
