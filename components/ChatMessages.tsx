import React from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  isInitializing: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
}

const icons = {
  ai: (
    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg mt-2">
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
  ),
  user: (
    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-lg">
      <span className="text-slate-100 text-sm sm:text-base font-semibold">U</span>
    </div>
  ),
};

const ChatMessages = ({ isInitializing, isLoading, messages }: ChatMessagesProps) => {
  if (isInitializing)
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-xs sm:text-sm">Loading document...</span>
      </div>
    );

  if (!messages.length)
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <div className="text-center w-full">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-xs sm:text-sm">Select a document to start chatting</p>
        </div>
      </div>
    );

  return (
    <div>
      <div className="flex flex-col gap-2">
        {messages.map(({ id, type, content, timestamp }) => {
          const isUser = type === 'user';
          return (
            <div key={id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && <div className="flex flex-col items-center mr-2">{icons.ai}</div>}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[70%]`}>
                <div className={`rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg ${isUser ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 rounded-br-md' : 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white rounded-bl-md'}`}>
                  <p className="whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">{content}</p>
                </div>
                <span className={`text-[11px] sm:text-xs text-slate-400 mt-1 mb-1 ${isUser ? 'pr-1' : 'pl-1'}`}>
                  {timestamp.toLocaleTimeString()}
                </span>
              </div>
              {isUser && <div className="flex flex-col items-center ml-2">{icons.user}</div>}
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="flex w-full justify-start mt-2">
          <div className="flex flex-col items-center mr-2">{icons.ai}</div>
          <div className="max-w-[90%] sm:max-w-[70%] flex items-center">
            <div className="bg-gradient-to-r from-emerald-600/90 to-teal-600/90 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/80 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;