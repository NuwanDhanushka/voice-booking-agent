'use client';

type VoiceCallButtonProps = {
    onOpen: () => void;
};

export function VoiceCallButton({ onOpen }: VoiceCallButtonProps) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-lg hover:opacity-90"
        >
            Start Voice Call
        </button>
    );
}