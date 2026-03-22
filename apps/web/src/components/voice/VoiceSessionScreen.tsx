'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type VoiceUiState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

import { transcribeAudio, sendVoiceMessage, VoiceMessageResponse, AgentResponse } from '@/lib/api/client';

type VoiceTurn = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 3000;
const SILENCE_GRACE_PERIOD_MS = 1500;

function createSessionId(): string {
    return `sess-voice-${crypto.randomUUID()}`;
}

function getSubtitle(state: VoiceUiState) {
    switch (state) {
        case 'listening':
            return 'Listening...';
        case 'thinking':
            return 'Thinking...';
        case 'speaking':
            return 'Speaking...';
        case 'error':
            return 'Something went wrong';
        default:
            return 'Ready';
    }
}

function getScale(state: VoiceUiState) {
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

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function VoiceOrb({ state }: { state: VoiceUiState }) {
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

export function VoiceSessionScreen() {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<VoiceUiState>('idle');
    const [sessionId, setSessionId] = useState<string>(() => createSessionId());
    const [transcript, setTranscript] = useState('');
    const [assistantReply, setAssistantReply] = useState('');
    const [bookingReference, setBookingReference] = useState<string | null>(null);
    const [slots, setSlots] = useState<AgentResponse['slots']>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [history, setHistory] = useState<VoiceTurn[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isRecordingRef = useRef(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        return () => {
            stopSpeaking();
            stopTracks();
        };
    }, []);

    function stopAudioAnalysis() {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();

        sourceRef.current = null;
        analyserRef.current = null;

        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }

        silenceStartRef.current = null;
    }

    function stopTracks() {
        stopAudioAnalysis();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    function stopSpeaking() {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    }

    function getRmsVolume(analyser: AnalyserNode): number {
        const buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);

        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i += 1) {
            sumSquares += buffer[i] * buffer[i];
        }

        return Math.sqrt(sumSquares / buffer.length);
    }

    function startSilenceDetection() {
        const analyser = analyserRef.current;
        if (!analyser) return;

        const recordingStartedAt = Date.now();

        const check = async () => {
            if (!isRecordingRef.current) return;

            const now = Date.now();
            const elapsed = now - recordingStartedAt;

            if (elapsed < SILENCE_GRACE_PERIOD_MS) {
                animationFrameRef.current = requestAnimationFrame(() => {
                    void check();
                });
                return;
            }

            const volume = getRmsVolume(analyser);

            if (volume < SILENCE_THRESHOLD) {
                if (silenceStartRef.current === null) {
                    silenceStartRef.current = now;
                }

                const silenceDuration = now - silenceStartRef.current;

                if (silenceDuration >= SILENCE_DURATION_MS) {
                    await stopRecording();
                    return;
                }
            } else {
                silenceStartRef.current = null;
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                void check();
            });
        };

        animationFrameRef.current = requestAnimationFrame(() => {
            void check();
        });
    }



    async function playAudioUrl(audioUrl: string) {
        try {
            stopSpeaking();
            setState('speaking');

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                if (!isRecordingRef.current) {
                    setState('idle');
                }
                audioRef.current = null;
            };

            audio.onerror = () => {
                setState('error');
                setErrorMessage('Failed to play assistant voice.');
            };

            await audio.play();
        } catch (error) {
            console.error(error);
            setState('error');
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to play assistant audio.',
            );
        }
    }

    async function startRecording() {
        if (isRecording) return;

        try {
            stopSpeaking();
            setErrorMessage(null);
            setTranscript('');
            setAssistantReply('');
            setSlots([]);
            setBookingReference(null);
            setState('listening');

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            analyser.fftSize = 2048;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            sourceRef.current = source;
            analyserRef.current = analyser;
            silenceStartRef.current = null;

            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            } catch {
                mediaRecorder = new MediaRecorder(stream);
            }

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            isRecordingRef.current = true;

            startSilenceDetection();
        } catch (error) {
            console.error(error);
            setState('error');
            setErrorMessage('Could not access microphone.');
        }
    }

    async function stopRecording() {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        setIsRecording(false);
        isRecordingRef.current = false;
        stopAudioAnalysis();

        const blob = await new Promise<Blob>((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const recordedBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                stopTracks();
                resolve(recordedBlob);
            };

            mediaRecorder.onerror = () => {
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                stopTracks();
                reject(new Error('Recording failed'));
            };

            mediaRecorder.stop();
        });

        try {
            setState('thinking');

            const text = await transcribeAudio(blob);
            const trimmed = text.trim();

            if (!trimmed) {
                throw new Error('No speech detected');
            }

            setTranscript(trimmed);
            setHistory((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'user',
                    text: trimmed,
                },
            ]);

            const agentData = await sendVoiceMessage(sessionId, trimmed);

            setAssistantReply(agentData.reply);
            setSlots(agentData.slots ?? []);
            setBookingReference(agentData.bookingReference ?? null);

            setHistory((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    text: agentData.reply,
                },
            ]);

            await playAudioUrl(agentData.audioUrl);
        } catch (error) {
            console.error(error);
            setState('error');
            setErrorMessage(
                error instanceof Error ? error.message : 'Voice request failed.',
            );
        }
    }

    async function handleMicClick() {
        if (state === 'speaking') {
            stopSpeaking();
            setAssistantReply('');
            setErrorMessage(null);
            setTranscript('Interrupted. Listening...');
            await startRecording();
            return;
        }

        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    }

    function handleReset() {
        stopSpeaking();
        stopTracks();
        setSessionId(createSessionId());
        setState('idle');
        setTranscript('');
        setAssistantReply('');
        setBookingReference(null);
        setSlots([]);
        setHistory([]);
        setErrorMessage(null);
        setIsRecording(false);
        isRecordingRef.current = false;
    }

    function handleClose() {
        stopSpeaking();
        stopTracks();
        setIsRecording(false);
        isRecordingRef.current = false;
        setOpen(false);
        setState('idle');
    }

    return (
        <main className="min-h-screen bg-neutral-950 text-white">
            <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
                <button
                    type="button"
                    onClick={() => {
                        setOpen(true);
                        setState('idle');
                        setTranscript('');
                        setAssistantReply('');
                        setErrorMessage(null);
                        setHistory([]);
                    }}
                    className="rounded-full bg-white px-6 py-4 text-sm font-medium text-black shadow-lg hover:opacity-90"
                >
                    Start Voice Call
                </button>
            </div>

            {open ? (
                <div className="fixed inset-0 z-50 bg-black">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(139,92,246,0.28),transparent_28%),radial-gradient(circle_at_right,rgba(168,85,247,0.28),transparent_28%)]" />

                    <div className="relative flex h-full flex-col">
                        <div className="flex items-center justify-between px-6 pt-6">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                                >
                                    ←
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500" />
                                    </div>

                                    <div>
                                        <div className="text-lg font-semibold text-white">
                                            Study Room Agent
                                        </div>
                                        <div className="text-sm text-white/60">{getSubtitle(state)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-full bg-white/10 px-3 py-2 text-xs text-white/70">
                                {sessionId}
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                            <VoiceOrb state={state} />

                            <div className="mt-10 max-w-3xl space-y-4">
                                <div className="text-xl font-semibold text-white">
                                    {transcript || 'Tap the mic and tell me what you want to book.'}
                                </div>

                                {assistantReply ? (
                                    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-6 text-white/85">
                                        {assistantReply}
                                    </div>
                                ) : null}

                                {bookingReference ? (
                                    <div className="text-sm text-emerald-300">
                                        Booking reference:{' '}
                                        <span className="font-mono">{bookingReference}</span>
                                    </div>
                                ) : null}

                                {history.length > 0 ? (
                                    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                                        <div className="mb-3 text-sm font-medium text-white/80">
                                            Conversation
                                        </div>
                                        <div className="max-h-56 space-y-3 overflow-y-auto">
                                            {history.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`rounded-xl px-4 py-3 text-sm leading-6 ${
                                                        item.role === 'user'
                                                            ? 'bg-fuchsia-500/15 text-white'
                                                            : 'bg-black/25 text-white/85'
                                                    }`}
                                                >
                                                    <div className="mb-1 text-[11px] uppercase tracking-wide text-white/50">
                                                        {item.role}
                                                    </div>
                                                    <div>{item.text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {slots && slots.length > 0 ? (
                                    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                                        <div className="mb-3 text-sm font-medium text-white/80">
                                            Available slots
                                        </div>
                                        <div className="space-y-2">
                                            {slots.slice(0, 5).map((slot, index) => (
                                                <div
                                                    key={`${slot.resourceId}-${slot.startTime}-${slot.endTime}`}
                                                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                                                >
                                                    <div className="font-medium">
                                                        {index + 1}. {slot.resourceName}
                                                    </div>
                                                    <div className="mt-1 text-white/60">
                                                        {formatTime(slot.startTime)} to {formatTime(slot.endTime)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {errorMessage ? (
                                    <div className="text-sm text-red-400">{errorMessage}</div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-10 pb-10">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80"
                            >
                                ↺
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleMicClick()}
                                className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-[0_0_50px_rgba(217,70,239,0.45)] transition ${
                                    isRecording
                                        ? 'bg-red-500'
                                        : 'bg-gradient-to-br from-pink-400 to-violet-500'
                                }`}
                            >
                                {isRecording ? '■' : '🎤'}
                            </button>

                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80"
                            >
                                ✕
                            </button>
                        </div>

                        {isRecording ? (
                            <div className="pb-6 text-center text-sm text-fuchsia-300">
                                Listening... I’ll stop automatically when you finish speaking.
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </main>
    );
}