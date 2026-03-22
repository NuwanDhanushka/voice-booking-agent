type Slot = {
    resourceId: string;
    resourceName: string;
    startTime: string;
    endTime: string;
};

type SlotListProps = {
    slots: Slot[];
    onSelect: (index: number) => void;
};

function formatTime(value: string): string {
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function SlotList({ slots, onSelect }: SlotListProps) {
    return (
        <div className="space-y-3">
            {slots.map((slot, index) => (
                <button
                    key={`${slot.resourceId}-${slot.startTime}-${slot.endTime}`}
                    type="button"
                    onClick={() => onSelect(index)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-left hover:bg-neutral-800"
                >
                    <div className="text-sm font-medium text-neutral-100">
                        {index + 1}. {slot.resourceName}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                        {formatTime(slot.startTime)} to {formatTime(slot.endTime)}
                    </div>
                </button>
            ))}
        </div>
    );
}