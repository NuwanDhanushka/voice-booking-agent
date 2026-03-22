'use client';

import { FormEvent, useState } from 'react';

type MessageInputProps = {
    onSend: (message: string) => void | Promise<void>;
    isLoading: boolean;
};

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
    const [value, setValue] = useState('');

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmed = value.trim();
        if (!trimmed || isLoading) return;

        void onSend(trimmed);
        setValue('');
    }

    return (
        <form className="flex gap-3" onSubmit={handleSubmit}>
            <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder='Type a message, like "book a study room tomorrow evening for 2 hours"'
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm outline-none ring-0 placeholder:text-neutral-500 focus:border-neutral-500"
            />
            <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
                Send
            </button>
        </form>
    );
}