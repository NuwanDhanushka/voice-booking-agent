type VoiceControlsProps = {
    onReset: () => void;
    onMic: () => void;
    onEnd: () => void;
};

export function VoiceControls({
                                  onReset,
                                  onMic,
                                  onEnd,
                              }: VoiceControlsProps) {
    return (
        <div className="flex items-center justify-center gap-10 pb-10">
            <button
                type="button"
                onClick={onReset}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80"
            >
                ↺
            </button>

            <button
                type="button"
                onClick={onMic}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-violet-500 text-3xl text-white shadow-[0_0_50px_rgba(217,70,239,0.45)]"
            >
                🎤
            </button>

            <button
                type="button"
                onClick={onEnd}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80"
            >
                ✕
            </button>
        </div>
    );
}