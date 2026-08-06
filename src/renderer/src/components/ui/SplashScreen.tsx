import { motion } from 'framer-motion'
import logo from '../../assets/logo.png'
import { duration, easeInOut } from '../../motion'
import './SplashScreen.css'

type Props = {
  visible: boolean
}

export function SplashScreen({ visible }: Props) {
  if (!visible) return null

  return (
    <motion.div
      className="splash"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.slow, ease: easeInOut }}
    >
      <motion.div
        className="splash__mark"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: duration.slow, ease: easeInOut }}
      >
        <motion.img
          src={logo}
          alt=""
          className="splash__logo"
          animate={{ scale: [1, 1.04, 1], opacity: [0.92, 1, 0.92] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <div className="splash__glow" aria-hidden />
      </motion.div>
      <motion.p
        className="splash__title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: duration.base, ease: easeInOut }}
      >
        Slowed <span>+ Reverb</span>
      </motion.p>
      <motion.div
        className="splash__bar"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: easeInOut }}
      />
    </motion.div>
  )
}
