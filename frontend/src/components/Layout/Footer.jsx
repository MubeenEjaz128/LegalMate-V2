import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, MapPin, Phone, Scale, Github, Linkedin, Twitter } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-secondary-900 text-white">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative container-custom pt-16 pb-8">
        {/* Top section */}
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Legal<span className="text-primary-400">Mate</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary-400">
              Modern legal consultations with trusted professionals, transparent workflows, and AI-assisted guidance — built for Punjab, Pakistan.
            </p>

            {/* Contact info */}
            <div className="mt-6 space-y-3">
              <a
                href="mailto:legalmate.services@gmail.com"
                className="flex items-center gap-3 text-sm text-secondary-400 hover:text-primary-400 transition-colors duration-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-800">
                  <Mail className="h-4 w-4" />
                </div>
                legalmate.services@gmail.com
              </a>
              <a
                href="tel:+923001234567"
                className="flex items-center gap-3 text-sm text-secondary-400 hover:text-primary-400 transition-colors duration-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-800">
                  <Phone className="h-4 w-4" />
                </div>
                +92 300 1234567
              </a>
              <div className="flex items-center gap-3 text-sm text-secondary-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-800">
                  <MapPin className="h-4 w-4" />
                </div>
                Lahore, Punjab, Pakistan
              </div>
            </div>
          </div>

          {/* Link groups */}
          <div className="lg:col-span-8 grid gap-8 sm:grid-cols-3">
            <FooterGroup
              title="Platform"
              links={[
                { label: 'Find Lawyers', href: '/search' },
                { label: 'Services', href: '/services' },
                { label: 'Blogs', href: '/blogs' },
                { label: 'FAQ', href: '/faq' },
              ]}
            />
            <FooterGroup
              title="Company"
              links={[
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Developer', href: '/developer' },
                { label: 'Dashboard', href: '/dashboard' },
              ]}
            />
            <FooterGroup
              title="Legal"
              links={[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
              ]}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mt-14 border-t border-secondary-800" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-4 text-xs text-secondary-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} LegalMate. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            Designed for clarity and trust
            <ArrowUpRight className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </footer>
  )
}

const FooterGroup = ({ title, links }) => (
  <div>
    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-500">{title}</h3>
    <ul className="mt-5 space-y-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            to={link.href}
            className="text-sm text-secondary-400 hover:text-primary-400 transition-colors duration-200"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

export default Footer
