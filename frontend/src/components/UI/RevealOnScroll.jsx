import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const RevealOnScroll = ({
  children,
  className = '',
  delay = 0,
  y = 24,
  once = true,
  amount = 0.2,
  duration = 0.55
}) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default RevealOnScroll
