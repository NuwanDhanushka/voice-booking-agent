'use client';

import { motion } from 'framer-motion';

type VoiceOrbProps = {
    state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
};

function getScale(state: VoiceOrbProps['state']) {
    switch (state) {
        case 'listening':
            return 1.08;
        case 'thinking':
            return 0.96;
        case 'speaking':
            return 1.14;
        case 'error':
            return 0.92;
        default:
            return 1;
    }
}

export function VoiceOrb({ state }: VoiceOrbProps) {
    const scale = getScale(state);

    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                animate={{
                    scale: [1, scale, 1],
                    rotate: [0, 8, -8, 0],
                }}
                transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className="relative h-56 w-56 rounded-full"
            >
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.45),rgba(168,85,247,0.35),rgba(0,0,0,0.05))] blur-[2px]" />

                <div className="absolute inset-2 rounded-full bg-[conic-gradient(from_0deg,rgba(236,72,153,0.9),rgba(139,92,246,0.9),rgba(244,114,182,0.9),rgba(236,72,153,0.9))] opacity-90 blur-[1px]" />

                <div className="absolute inset-5 rounded-full bg-black/35 backdrop-blur-xl" />

                <motion.div
                    animate={{
                        opacity: [0.45, 0.9, 0.45],
                        scale: [0.9, 1.12, 0.9],
                    }}
                    transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute -inset-5 rounded-full bg-fuchsia-500/20 blur-3xl"
                />
            </motion.div>
        </div>
    );
}