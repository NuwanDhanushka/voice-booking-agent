type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

type MessageListProps = {
    messages: ChatMessage[];
    isLoading: boolean;
};

export function MessageList({ messages, isLoading }: MessageListProps) {
    return (
        <div className="space-y-4">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === 'user'
                            ? 'ml-auto bg-blue-600 text-white'
                            : 'bg-neutral-800 text-neutral-100'
                    }`}
                >
                    <div className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
                        {message.role}
                    </div>
                    <div className="whitespace-pre-wrap">{message.text}</div>
                </div>
            ))}

            {isLoading ? (
                <div className="max-w-[85%] rounded-2xl bg-neutral-800 px-4 py-3 text-sm text-neutral-300">
                    Thinking...
                </div>
            ) : null}
        </div>
    );
}