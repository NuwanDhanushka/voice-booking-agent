'use client';

import { useMemo, useRef, useState } from 'react';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { SlotList } from './SlotList';

import { sendChatMessage, transcribeAudio, AgentResponse } from '@/lib/api/client';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

function createSessionId(): string {
    return `sess-web-${crypto.randomUUID()}`;
}

export function BookingChat() {
    const [sessionId] = useState<string>(() => createSessionId());
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'Hi! You can try: "book a study room tomorrow evening for 2 hours".',
        },
    ]);
    const [slots, setSlots] = useState<NonNullable<AgentResponse['slots']>>([]);
    const [state, setState] = useState<string>('waiting_for_request');
    const [bookingReference, setBookingReference] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const canShowSlots = useMemo(
        () => state === 'waiting_for_slot_selection' && slots.length > 0,
        [state, slots],
    );

    async function sendMessage(message: string) {
        const trimmed = message.trim();
        if (!trimmed || isLoading) return;

        setMessages((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                role: 'user',
                text: trimmed,
            },
        ]);

        setIsLoading(true);

        try {
            const agentData = await sendChatMessage(sessionId, trimmed);

            setState(agentData.state);
            setSlots(agentData.slots ?? []);
            setBookingReference(agentData.bookingReference ?? null);

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    text: agentData.reply,
                },
            ]);
        } catch (error) {
            const errorText =
                error instanceof Error ? error.message : 'Unexpected error';

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    text: `Error: ${errorText}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    async function startRecording() {
        if (isLoading || isRecording) return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
        });

        chunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
    }

    async function stopRecording() {
        const mediaRecorder = mediaRecorderRef.current;

        if (!mediaRecorder || !isRecording) return;

        const blob = await new Promise<Blob>((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const recordedBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                mediaRecorder.stream.getTracks().forEach((track) => track.stop());
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                setIsRecording(false);
                resolve(recordedBlob);
            };

            mediaRecorder.onerror = () => {
                mediaRecorder.stream.getTracks().forEach((track) => track.stop());
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                setIsRecording(false);
                reject(new Error('Recording failed'));
            };

            mediaRecorder.stop();
        });

        try {
            setIsLoading(true);

            const transcript = await transcribeAudio(blob);

            if (!transcript.trim()) {
                throw new Error('No speech detected');
            }

            await sendMessage(transcript);
        } catch (error) {
            const errorText =
                error instanceof Error ? error.message : 'Unexpected voice error';

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    text: `Voice error: ${errorText}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    async function toggleRecording() {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    }

    function handleSlotClick(index: number) {
        void sendMessage(`option ${index + 1}`);
    }

    return (
        <div className="grid flex-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
            <section className="flex min-h-[70vh] flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-sm">
                <div className="border-b border-neutral-800 px-5 py-4">
                    <div className="text-sm text-neutral-400">Session</div>
                    <div className="mt-1 font-mono text-xs text-neutral-300">{sessionId}</div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <MessageList messages={messages} isLoading={isLoading} />
                </div>

                <div className="border-t border-neutral-800 px-5 py-4">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <MessageInput
                                onSend={sendMessage}
                                isLoading={isLoading || isRecording}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => void toggleRecording()}
                            disabled={isLoading}
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${
                                isRecording
                                    ? 'bg-red-500 text-white shadow-lg'
                                    : 'bg-purple-600 text-white hover:bg-purple-500'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            title={isRecording ? 'Stop recording' : 'Start recording'}
                        >
                            {isRecording ? '■' : '🎤'}
                        </button>
                    </div>

                    {isRecording ? (
                        <div className="mt-3 text-sm text-red-400">
                            Listening... tap again to stop.
                        </div>
                    ) : null}
                </div>
            </section>

            <aside className="space-y-4">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-medium">Conversation State</h2>
                    <div className="mt-3 text-sm text-neutral-300">
                        <div>
                            <span className="text-neutral-500">State:</span> {state}
                        </div>
                        <div className="mt-2">
                            <span className="text-neutral-500">Booking Ref:</span>{' '}
                            {bookingReference ?? '—'}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-medium">Available Slots</h2>
                    <p className="mt-2 text-sm text-neutral-400">
                        You can click a slot or type “the first one”.
                    </p>

                    <div className="mt-4">
                        {canShowSlots ? (
                            <SlotList slots={slots} onSelect={handleSlotClick} />
                        ) : (
                            <div className="text-sm text-neutral-500">No active slot options.</div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-medium">Try these</h2>
                    <div className="mt-3 space-y-2 text-sm text-neutral-300">
                        <button
                            className="block w-full rounded-xl border border-neutral-700 px-3 py-2 text-left hover:bg-neutral-800"
                            onClick={() =>
                                void sendMessage('book a study room tomorrow evening for 2 hours')
                            }
                            type="button"
                        >
                            book a study room tomorrow evening for 2 hours
                        </button>

                        <button
                            className="block w-full rounded-xl border border-neutral-700 px-3 py-2 text-left hover:bg-neutral-800"
                            onClick={() => void sendMessage('book a study room')}
                            type="button"
                        >
                            book a study room
                        </button>

                        <button
                            className="block w-full rounded-xl border border-neutral-700 px-3 py-2 text-left hover:bg-neutral-800"
                            onClick={() => void sendMessage('tomorrow evening')}
                            type="button"
                        >
                            tomorrow evening
                        </button>

                        <button
                            className="block w-full rounded-xl border border-neutral-700 px-3 py-2 text-left hover:bg-neutral-800"
                            onClick={() => void sendMessage('for 2 hours')}
                            type="button"
                        >
                            for 2 hours
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}