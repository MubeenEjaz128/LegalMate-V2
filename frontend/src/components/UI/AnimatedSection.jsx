// Animated section wrapper – reveals children on scroll
import React from 'react'
import { motion } from 'framer-motion'

const presets = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
}

/**
 * <AnimatedSection preset="fadeUp" delay={0.2}>
 *   <Card>…</Card>
 * </AnimatedSection>
 */
const AnimatedSection = ({
  children,
  preset = 'fadeUp',
  delay = 0,
  duration = 0.6,
  once = true,
  margin = '-80px',
  className = '',
  as = 'div',
  stagger = 0,
  ...props
}) => {
  const Component = motion[as] || motion.div
  const variants = presets[preset] || presets.fadeUp

  const containerVariants = stagger
    ? {
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }
    : undefined

  const itemVariants = stagger
    ? {
        hidden: variants.hidden,
        visible: {
          ...variants.visible,
          transition: {
            duration,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }
    : undefined

  if (stagger) {
    return (
      <Component
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin }}
        variants={containerVariants}
        className={className}
        {...props}
      >
        {React.Children.map(children, (child) =>
          child ? (
            <motion.div variants={itemVariants}>{child}</motion.div>
          ) : null
        )}
      </Component>
    )
  }

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin }}
      variants={{
        hidden: variants.hidden,
        visible: {
          ...variants.visible,
          transition: {
            delay,
            duration,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

export default AnimatedSection
