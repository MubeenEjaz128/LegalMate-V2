// Smooth page transition wrapper
import React from 'react'
import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}

const PageTransition = ({ children, className = '' }) => (
  <motion.div
    initial="initial"
    animate="enter"
    exit="exit"
    variants={pageVariants}
    className={className}
  >
    {children}
  </motion.div>
)

export default PageTransition
