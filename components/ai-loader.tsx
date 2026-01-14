"use client"

import { motion } from "framer-motion"

interface AILoaderProps {
    message?: string
}

export function AILoader({ message = "AI is thinking..." }: AILoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
            {/* Animated Brain/AI Icon */}
            <div className="relative w-24 h-24">
                {/* Outer rotating ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary/20"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />

                {/* Middle pulsing ring */}
                <motion.div
                    className="absolute inset-2 rounded-full border-4 border-primary/40"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.4, 0.8, 0.4]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Inner rotating ring (opposite direction) */}
                <motion.div
                    className="absolute inset-4 rounded-full border-4 border-primary/60"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {/* Center dot */}
                <motion.div
                    className="absolute inset-8 rounded-full bg-primary"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Sparkle effects */}
                {[0, 1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-primary rounded-full"
                        style={{
                            top: '50%',
                            left: '50%',
                            marginTop: '-4px',
                            marginLeft: '-4px',
                        }}
                        animate={{
                            x: [0, Math.cos(i * Math.PI / 2) * 50],
                            y: [0, Math.sin(i * Math.PI / 2) * 50],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </div>

            {/* Loading text */}
            <div className="flex flex-col items-center gap-2">
                <motion.p
                    className="text-lg font-medium text-foreground"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    {message}
                </motion.p>

                {/* Animated dots */}
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{
                                y: [0, -8, 0],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Progress indicator */}
            <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
                    animate={{
                        x: ['-100%', '100%']
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{ width: '50%' }}
                />
            </div>
        </div>
    )
}

// Compact version for inline use
export function AILoaderCompact() {
    return (
        <div className="inline-flex items-center gap-2">
            <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Outer rotating ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary-foreground/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />

                {/* Inner rotating ring (opposite) */}
                <motion.div
                    className="absolute inset-0.5 rounded-full border-2 border-primary-foreground/60 border-t-transparent border-b-transparent"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {/* Center dot */}
                <motion.div
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary-foreground"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
            <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                Generating...
            </motion.span>
        </div>
    )
}
