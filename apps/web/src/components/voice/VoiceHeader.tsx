type VoiceHeaderProps = {
    title: string;
    subtitle: string;
    onClose: () => void;
};

export function VoiceHeader({ title, subtitle, onClose }: VoiceHeaderProps) {
    return (
        <div className="flex items-center justify-between px-6 pt-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-10 w-10 rounded-full bg-white/10 text-white"
                >
                    ←
                </button>

                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500" />
                    </div>

                    <div>
                        <div className="text-lg font-semibold text-white">{title}</div>
                        <div className="text-sm text-white/60">{subtitle}</div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="h-10 w-10 rounded-full bg-white/10 text-white"
            >
                ⋮
            </button>
        </div>
    );
}