import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { servicesAPI } from '../services/api'
import { CheckCircle, ArrowRight, Loader2, Sparkles, Scale } from 'lucide-react'
import * as Icons from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatedSection, Badge, Button } from '../components/UI'

const ServicesPage = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [ctaUrl, setCtaUrl] = useState('/search')

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await servicesAPI.getServices()
      setServices(response.data.services)
      if (response.data.ctaUrl) setCtaUrl(response.data.ctaUrl)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (iconName) => {
    const Icon = Icons[iconName] || Icons.Gavel
    return Icon
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* ─── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />

        <div className="relative container-custom py-16 lg:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="primary-outline" className="!border-white/25 !bg-white/10 !text-white" icon={Sparkles}>
              Professional Services
            </Badge>
            <h1 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Our Legal Services
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-secondary-300 sm:text-lg">
              Professional legal consultation powered by AI and expert lawyers
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Services grid ────────────────────────────── */}
      <div className="container-custom py-14 lg:py-20">
        {services.length === 0 ? (
          <div className="py-20 text-center">
            <Scale className="mx-auto mb-4 h-14 w-14 text-secondary-300" />
            <p className="text-lg text-secondary-500">No services available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, idx) => {
              const Icon = getIcon(service.icon)
              return (
                <AnimatedSection key={service._id} preset="fadeUp" delay={idx * 0.06}>
                  <div className="group flex h-full flex-col rounded-2xl border border-secondary-100 bg-white p-7 shadow-soft transition-all duration-300 hover:border-primary-200 hover:shadow-medium hover:-translate-y-1">
                    {/* Icon */}
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 transition-colors duration-300 group-hover:bg-primary-600 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-secondary-900">{service.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-secondary-600 line-clamp-3">
                      {service.description}
                    </p>

                    {/* Features */}
                    {service.features && service.features.length > 0 && (
                      <ul className="mt-5 space-y-2.5">
                        {service.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-secondary-700">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA */}
                    <Link
                      to={ctaUrl}
                      className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-700 hover:shadow-glow-sm"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── CTA section ──────────────────────────────── */}
      <AnimatedSection preset="scaleUp">
        <section className="section-padding">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-900 px-8 py-14 text-center text-white shadow-elevated sm:px-14">
              <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent-400/15 blur-3xl" />

              <div className="relative">
                <h2 className="text-2xl font-bold sm:text-3xl">Need Legal Consultation?</h2>
                <p className="mx-auto mt-3 max-w-xl text-secondary-300">
                  Connect with expert lawyers or chat with our AI assistant for instant guidance
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link to="/search">
                    <Button size="lg" className="!bg-white !text-secondary-900 hover:!bg-secondary-50 !rounded-2xl">
                      Find a Lawyer
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20 !rounded-2xl"
                    onClick={() => window.dispatchEvent(new Event('open-floating-chatbot'))}
                  >
                    Chat with AI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  )
}

export default ServicesPage
