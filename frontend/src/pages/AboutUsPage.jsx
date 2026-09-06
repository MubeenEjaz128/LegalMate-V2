import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pagesAPI } from '../services/api'
import { Target, Eye, Heart, Users, Award, Shield, Loader2, Scale, ArrowRight } from 'lucide-react'
import { AnimatedSection, Badge, Button, Card } from '../components/UI'

const AboutUsPage = () => {
  const [pageContent, setPageContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPageContent()
  }, [])

  const fetchPageContent = async () => {
    try {
      setLoading(true)
      const response = await pagesAPI.getPage('about')
      const fetchedContent = response.data.page?.content || {}
      const defaultContent = getDefaultContent()
      setPageContent({
        vision: fetchedContent.vision || defaultContent.vision,
        mission: fetchedContent.mission || defaultContent.mission,
        story: fetchedContent.story || defaultContent.story,
        values:
          Array.isArray(fetchedContent.values) && fetchedContent.values.length > 0
            ? fetchedContent.values
            : defaultContent.values,
        stats:
          Array.isArray(fetchedContent.stats) && fetchedContent.stats.length > 0
            ? fetchedContent.stats
            : defaultContent.stats,
      })
    } catch (error) {
      console.error('Error fetching page content:', error)
      setPageContent(getDefaultContent())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultContent = () => ({
    vision:
      'To revolutionize legal services by making expert legal consultation accessible, affordable, and efficient through AI-powered technology.',
    mission:
      'Empowering individuals and businesses with instant access to legal guidance and connecting them with qualified legal professionals.',
    story:
      'LegalMate was founded with a simple yet powerful idea: to bridge the gap between people seeking legal help and qualified legal professionals. We recognized that accessing legal advice can be expensive, time-consuming, and intimidating. Our platform combines cutting-edge AI technology with human expertise to provide immediate, accurate, and affordable legal consultation.',
    values: [
      { title: 'Accessibility', description: 'Making legal services available to everyone, regardless of their location or financial status.', icon: 'Users' },
      { title: 'Excellence', description: 'Maintaining the highest standards of legal consultation and customer service.', icon: 'Award' },
      { title: 'Integrity', description: 'Operating with transparency, honesty, and ethical practices in all our interactions.', icon: 'Shield' },
      { title: 'Innovation', description: 'Continuously improving our AI technology and services to better serve our clients.', icon: 'Target' },
    ],
    stats: [
      { label: 'Active Users', value: '10,000+', icon: 'Users' },
      { label: 'Legal Consultations', value: '50,000+', icon: 'Heart' },
      { label: 'Expert Lawyers', value: '500+', icon: 'Award' },
      { label: 'Success Rate', value: '98%', icon: 'Target' },
    ],
  })

  const getIcon = (iconName) => {
    const icons = { Users, Award, Shield, Target, Heart, Eye }
    return icons[iconName] || Target
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const content = pageContent || getDefaultContent()

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* ─── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />

        <div className="relative container-custom py-16 lg:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="primary-outline" className="!border-white/25 !bg-white/10 !text-white">
              Our Story
            </Badge>
            <h1 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">About LegalMate</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-secondary-300 sm:text-lg">
              Your trusted partner in modern legal consultation
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Our Story ────────────────────────────────── */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <AnimatedSection preset="fadeUp">
              <Badge variant="primary-outline" className="mb-4">Who We Are</Badge>
              <h2 className="text-3xl font-bold text-secondary-900">Our Story</h2>
              <p className="mt-5 text-base leading-relaxed text-secondary-600">{content.story}</p>
            </AnimatedSection>

            <AnimatedSection preset="fadeUp" delay={0.15}>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200/60 p-10 flex flex-col items-center justify-center h-80 shadow-soft">
                <Scale className="h-20 w-20 text-primary-600 mb-4" />
                <p className="text-primary-800 font-bold text-xl">LegalMate</p>
                <p className="text-primary-600 text-sm mt-1">Justice meets technology</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── Vision & Mission ─────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid gap-8 md:grid-cols-2">
            <AnimatedSection preset="fadeUp">
              <Card className="h-full !bg-gradient-to-br !from-primary-50 !to-white border border-primary-100">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-secondary-900">Our Vision</h3>
                <p className="mt-4 text-base leading-relaxed text-secondary-600">{content.vision}</p>
              </Card>
            </AnimatedSection>

            <AnimatedSection preset="fadeUp" delay={0.1}>
              <Card className="h-full !bg-gradient-to-br !from-success-50 !to-white border border-success-100">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500 to-success-700 text-white shadow-md">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-secondary-900">Our Mission</h3>
                <p className="mt-4 text-base leading-relaxed text-secondary-600">{content.mission}</p>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ────────────────────────────────── */}
      <section className="bg-secondary-900 py-14">
        <div className="container-custom">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {content?.stats?.map((stat, idx) => {
              const Icon = getIcon(stat.icon)
              return (
                <AnimatedSection key={idx} preset="fadeUp" delay={idx * 0.08}>
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
                      <Icon className="h-6 w-6 text-primary-300" />
                    </div>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-secondary-400">{stat.label}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Core Values ──────────────────────────────── */}
      <section className="section-padding">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-secondary-900">Our Core Values</h2>
            <p className="mt-3 text-secondary-600">The principles that guide everything we do</p>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content?.values?.map((value, idx) => {
              const Icon = getIcon(value.icon)
              return (
                <AnimatedSection key={idx} preset="fadeUp" delay={idx * 0.08}>
                  <Card hover className="h-full text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary-900">{value.title}</h3>
                    <p className="mt-3 text-sm text-secondary-600">{value.description}</p>
                  </Card>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <AnimatedSection preset="scaleUp">
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-900 px-8 py-14 text-center text-white shadow-elevated sm:px-14">
              <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent-400/15 blur-3xl" />
              <div className="relative">
                <h2 className="text-2xl font-bold sm:text-3xl">Ready to Get Started?</h2>
                <p className="mx-auto mt-3 max-w-xl text-secondary-300">
                  Join thousands of satisfied clients who trust LegalMate for their legal needs
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link to="/register">
                    <Button size="lg" className="!bg-white !text-secondary-900 hover:!bg-secondary-50 !rounded-2xl">
                      Sign Up Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button variant="outline" size="lg" className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20 !rounded-2xl">
                      Contact Us
                    </Button>
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

export default AboutUsPage
