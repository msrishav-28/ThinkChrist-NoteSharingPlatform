'use client'

import { UploadForm } from '@/features/resources'
import { motion } from 'framer-motion'
import { UploadCloud, Sparkles } from 'lucide-react'

export default function UploadPage() {
  return (
    <div className="space-y-8 p-1">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 to-teal-700 p-8 sm:p-12 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <UploadCloud className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight">
              Share Knowledge
            </h1>
          </div>
          <p className="text-lg text-green-100">
            Contribute to the community by uploading notes, assignments, or helpful resources.
            Earn points and help others succeed.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <UploadForm />
      </motion.div>
    </div>
  )
}