'use client';

import { useRef, useState } from 'react';

export function useVoiceRecorder() {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    async function startRecording() {
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

    async function stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const mediaRecorder = mediaRecorderRef.current;

            if (!mediaRecorder) {
                reject(new Error('No active recording'));
                return;
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                mediaRecorder.stream.getTracks().forEach((track) => track.stop());
                mediaRecorderRef.current = null;
                setIsRecording(false);
                resolve(blob);
            };

            mediaRecorder.stop();
        });
    }

    return {
        isRecording,
        startRecording,
        stopRecording,
    };
}