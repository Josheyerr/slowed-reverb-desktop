import type { Transition, Variants } from 'framer-motion'

/** Shared motion language — ~200–350ms, ease-in-out + light springs */
export const duration = {
  fast: 0.18,
  base: 0.28,
  slow: 0.36
} as const

export const easeOut = [0.22, 1, 0.36, 1] as const
export const easeInOut = [0.45, 0, 0.55, 1] as const

export const transitionBase: Transition = {
  duration: duration.base,
  ease: easeInOut
}

export const transitionFast: Transition = {
  duration: duration.fast,
  ease: easeOut
}

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.85
}

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 28
}

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 }
}

export const fadeSlideRight: Variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 }
}

export const fadeSlideLeft: Variants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 }
}

export const toastMotion: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.98 }
}

export const pressable = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 }
} as const
