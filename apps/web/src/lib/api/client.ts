/**
 * Shared API Client
 * Proxies securely to Next.js /api/proxy to safely inject API keys
 */

export type AgentResponse = {
    state: string;
    reply: string;
    slots?: Array<{
        resourceId: string;
        resourceName: string;
        startTime: string;
        endTime: string;
    }>;
    bookingReference?: string;
    bookingId?: string;
    missingFields?: string[];
};

export type VoiceMessageResponse = AgentResponse & {
    audioUrl: string;
};

export async function transcribeAudio(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const res = await fetch(`/api/proxy/voice/transcribe`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message ?? 'Failed to transcribe audio');
    }

    return typeof data.text === 'string' ? data.text : '';
}

export async function sendChatMessage(sessionId: string, message: string): Promise<AgentResponse> {
    const res = await fetch(`/api/proxy/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message ?? 'Chat request failed');
    }

    // Basic runtime enforcement replacing wild cast assumptions
    if (typeof data.state !== 'string' || typeof data.reply !== 'string') {
        throw new Error('Invalid response structure from backend agent');
    }

    return data as AgentResponse;
}

export async function sendVoiceMessage(sessionId: string, message: string): Promise<VoiceMessageResponse> {
    const res = await fetch(`/api/proxy/voice/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message ?? 'Voice request failed');
    }

    // Explicit check for media payloads dropping
    if (typeof data.audioUrl !== 'string') {
        throw new Error('Missing audio URL from voice agent backend payload');
    }

    return data as VoiceMessageResponse;
}
