"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  getCurrentUser, 
  saveMessage, 
  createSession, 
  fetchLastMessages,
  getDocumentByFileName,
  findExistingSession
} from "@/server/server.actions";
import { useRouter } from "next/navigation";
import { User } from "@/constants/types";
import UploadFile from "@/components/UploadFile";
import ShowFiles from "@/components/ShowFiles";
import { queryRelevantChunks } from "@/server/embed.actions";
import ChatMessages from "@/components/ChatMessages";
import { Toaster } from 'react-hot-toast';
import ChatHeader from "@/components/ChatHeader";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const Page = () => {
  const [user, setUser] = useState<User>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{ id: string; name: string } | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const response = await getCurrentUser();
      if (!response) {
        return router.push("/login");
      } else {
        setUser(response);
      }
    };
    fetchUser();
  }, [router]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to input
  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll to input when document is selected and messages are loaded
  useEffect(() => {
    if (selectedFile && messages.length > 0 && !isInitializing) {
      setTimeout(() => {
        scrollToInput();
      }, 100);
    }
  }, [selectedFile, messages.length, isInitializing]);

  // Load conversation history for a session
  const loadConversationHistory = async (sessionId: string) => {
    try {
      const messages = await fetchLastMessages(sessionId, 10);
      const threadMessages: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));
      setMessages(threadMessages);
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    }
  };

  // Create or reuse session when file is selected
  useEffect(() => {
    const initializeSession = async () => {
      if (selectedFile && user?.id && !initializingRef.current) {
        try {
          initializingRef.current = true;
          setIsInitializing(true);
          
          // Load document information and create session in one flow
          const document = await getDocumentByFileName(selectedFile, user.id);
          console.log("document", document);
          
          if (document) {
            setCurrentDocument({
              id: document.id,
              name: document.name
            });
            
            // Try to find existing session for this document
            const existingSession = await findExistingSession(user.id, document.id);
            
            if (existingSession) {
              // Reuse existing session
              setSessionId(existingSession.id);
              await loadConversationHistory(existingSession.id);
            } else {
              // Create new session for this document
              const newSessionId = await createSession(user.id, document.id, document.name);
              setSessionId(newSessionId);
              
              // Load conversation history for this session (will be empty for new sessions)
              await loadConversationHistory(newSessionId);
            }
          } else {
            setCurrentDocument(null);
          }
        } catch (error) {
          console.error("Failed to initialize session:", error);
        } finally {
          setIsInitializing(false);
          initializingRef.current = false;
        }
      } else if (!selectedFile) {
        // No file selected, ensure states are reset
        setCurrentDocument(null);
        setSessionId(null);
        setMessages([]);
        setIsInitializing(false);
        initializingRef.current = false;
      }
    };

    initializeSession();
  }, [selectedFile, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatMessage.trim() || !selectedFile || !user?.id) {
      return;
    }

    setIsLoading(true);
    
    // Create session if not exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession(user.id);
        setSessionId(currentSessionId);
      } catch (error) {
        console.error("Failed to create session:", error);
        setIsLoading(false);
        return;
      }
    }

    // Ensure we have a valid session ID
    if (!currentSessionId) {
      console.error("No session ID available");
      setIsLoading(false);
      return;
    }

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = chatMessage;
    setChatMessage("");

    // Save user message to database
    await saveMessage({
      sessionId: currentSessionId!,
      role: "user",
      content: currentMessage,
    });

    try {
      // Get relevant chunks from the current document
      const chunks = await queryRelevantChunks(currentMessage, currentDocument?.id);
      
      if (chunks.length === 0) {
        const aiResponse = currentDocument 
          ? `I couldn't find any relevant information in "${currentDocument.name}" to answer that question. Please try asking something else about this document.`
          : "I couldn't find any relevant information in your document to answer that question. Please try asking something else or upload a document that might contain the information you're looking for.";
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponse,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);

        // Save AI message to database
        await saveMessage({
          sessionId: currentSessionId!,
          role: "ai",
          content: aiResponse,
        });
        return;
      }

      // Create streaming AI message
      const streamingMessageId = Date.now().toString();
      const streamingMessage: ChatMessage = {
        id: streamingMessageId,
        type: 'ai',
        content: "",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, streamingMessage]);
      setStreamingMessageId(streamingMessageId);

      // Start streaming response
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          chunks,
          chatMessage: currentMessage,
          threadMessages: convertMessagesToThread(messages),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === streamingMessageId 
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    )
                  );
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        setStreamingMessageId(null);
      }

    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      // Save error message to database
      try {
        await saveMessage({
          sessionId: currentSessionId!,
          role: "ai",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
        });
      } catch (saveError) {
        console.error("Failed to save error message:", saveError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (fileName: string | null) => {
    
    // Reset all states immediately
    setSelectedFile(fileName);
    setSessionId(null);
    setMessages([]);
    setCurrentDocument(null);
    setChatMessage("");
    
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    
    if (!fileName) {
      return;
    }
    
  };

  // Convert UI messages to AI thread format
  const convertMessagesToThread = (uiMessages: ChatMessage[]) => {
    return uiMessages
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile Header - Fixed at top */}
      <Header 
        variant="mobile-top"
        userEmail={user?.email}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main content Area */}
      <div className="flex flex-col md:flex-row h-full pt-[72px] md:pt-0">
        {/* Sidebar */}
        <div className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:w-80 w-full md:relative fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 border-r border-slate-600/50 transition-transform duration-300 flex flex-col shadow-xl`}>
          {/* Desktop Header */}
          <Header 
            variant="desktop"
            userEmail={user?.email}
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Mobile Header with Back Button */}
          <Header 
            variant="mobile-sidebar"
            userEmail={user?.email}
            onBackClick={() => setIsSidebarOpen(false)}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Upload Section */}
            <div className="p-4 border-b border-slate-600/50">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Upload Documents</h2>
              {user && <UploadFile user={user} />}
            </div>

            {/* Files Section */}
            <div className="p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Your Documents</h2>
              {user && <ShowFiles user={user} onFileSelect={handleFileSelect} selectedFile={selectedFile} />}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-600/50 space-y-2 mb-[2px]">
            <Footer user={user} selectedFile={selectedFile}/>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Chat Header */}
          <ChatHeader selectedFile={selectedFile} sessionId={sessionId} />

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ChatMessages 
              isInitializing={isInitializing} 
              isLoading={isLoading} 
              messages={messages}
              streamingMessageId={streamingMessageId}
            />
            {/* Invisible div for scroll to bottom */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-600/50 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm" ref={inputRef}>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question about your document..."
                className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm backdrop-blur-sm"
                disabled={isLoading || isInitializing}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || !selectedFile || isLoading}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-200 text-sm whitespace-nowrap shadow-lg hover:shadow-emerald-500/25"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
          },
          success: {
            style: {
              background: '#064e3b',
              border: '1px solid #10b981',
            },
          },
          error: {
            style: {
              background: '#7f1d1d',
              border: '1px solid #ef4444',
            },
          },
        }}
      />
    </div>
  );
};

export default Page;
