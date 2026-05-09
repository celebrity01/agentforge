"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <motion.div
        className="size-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="size-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.div
        className="size-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  );
}
