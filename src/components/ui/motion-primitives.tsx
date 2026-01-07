'use client'

import { motion, useInView, useAnimation, Variant } from 'framer-motion'
import { ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MotionProps {
    children: ReactNode
    className?: string
    delay?: number
    duration?: number
}

export const FadeIn = ({ children, className, delay = 0, duration = 0.5 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration, delay, ease: 'easeOut' }}
        className={className}
    >
        {children}
    </motion.div>
)

export const SlideUp = ({ children, className, delay = 0, duration = 0.5 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
            type: "spring",
            damping: 20,
            stiffness: 100,
            delay
        }}
        className={className}
    >
        {children}
    </motion.div>
)

export const ScaleIn = ({ children, className, delay = 0, duration = 0.5 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{
            type: "spring",
            damping: 20,
            stiffness: 100,
            delay
        }}
        className={className}
    >
        {children}
    </motion.div>
)

export const HoverCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn("cursor-pointer", className)}
    >
        {children}
    </motion.div>
)

export function WordPullUp({
    words,
    wrapperFramerProps = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    },
    framerProps = {
        hidden: { y: 20, opacity: 0 },
        show: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 100
            }
        },
    },
    className,
}: {
    words: string
    wrapperFramerProps?: any
    framerProps?: any
    className?: string
}) {
    return (
        <motion.h1
            variants={wrapperFramerProps}
            initial="hidden"
            animate="show"
            className={cn(
                "font-heading text-center text-4xl font-bold leading-[1.1] tracking-[-0.02em] drop-shadow-sm",
                className,
            )}
        >
            {words.split(" ").map((word, i) => (
                <motion.span
                    key={i}
                    variants={framerProps}
                    style={{ display: "inline-block", paddingRight: "0.2em" }}
                >
                    {word}
                </motion.span>
            ))}
        </motion.h1>
    )
}

