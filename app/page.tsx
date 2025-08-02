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
import fetchAnswer from "@/server/ai-model";
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
  }, []);

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

    try {
      // Save user message to database
      await saveMessage({
        sessionId: currentSessionId!,
        role: "user",
        content: currentMessage,
      });

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

      // Get AI response
      const answer = await fetchAnswer(chunks, currentMessage, convertMessagesToThread(messages));
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: answer,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message to database
      await saveMessage({
        sessionId: currentSessionId!,
        role: "ai",
        content: answer,
      });

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
    <div className="h-screen bg-gray-900">
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
        } md:w-80 w-full md:relative fixed inset-y-0 left-0 z-50 bg-gray-800 border-r border-gray-700 transition-transform duration-300 flex flex-col`}>
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
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Upload Documents</h2>
              {user && <UploadFile user={user} />}
            </div>

            {/* Files Section */}
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Your Documents</h2>
              {user && <ShowFiles user={user} onFileSelect={handleFileSelect} selectedFile={selectedFile} />}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 space-y-2 mb-[2px]">
            <Footer user={user} selectedFile={selectedFile}/>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Chat Header */}
          <ChatHeader selectedFile={selectedFile} sessionId={sessionId} />

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ChatMessages isInitializing={isInitializing} isLoading={isLoading} messages={messages}/>
            {/* Invisible div for scroll to bottom */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700 bg-gray-800" ref={inputRef}>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question about your document..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                disabled={isLoading || isInitializing}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || !selectedFile || isLoading}
                className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
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
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            style: {
              background: '#065f46',
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
