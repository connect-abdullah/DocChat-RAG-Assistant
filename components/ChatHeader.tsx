import React from 'react'

interface ChatHeaderProps {
    selectedFile?: string | null;
    sessionId?: string | null;
  }
  
const ChatHeader = ({selectedFile,sessionId}:ChatHeaderProps) => {
  return (
    <div className="hidden md:block p-4 border-b border-gray-700 bg-gray-800 h-20 min-h-20">
      <div className="flex items-center gap-3 h-full">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white truncate">
            {selectedFile ? `Chat with ${selectedFile}` : "Chat with your documents"}
          </h2>
          <p className="text-sm text-gray-400 truncate">
            {selectedFile ? "Ask questions about your document" : "Select a document to start chatting"}
          </p>
          {sessionId && (
            <p className="text-xs text-gray-500 mt-1">
              Session: {sessionId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatHeader