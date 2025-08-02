"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  getCurrentUser, 
  signUp, 
  login, 
  uploadFile, 
  listFiles, 
  saveMessage, 
  createSession, 
  fetchLastMessages,
  getDocumentByFileName,
  findExistingSession
} from "@/server/server.actions";
import { useRouter } from "next/navigation";
import { User } from "@/constants/types";
import { supabase } from "@/db/supabase";
import UploadFile from "@/components/UploadFile";
import ShowFiles from "@/components/ShowFiles";
import { queryRelevantChunks } from "@/server/embed.actions";
import fetchAnswer from "@/server/ai-model";
import { testAPI } from "@/server/test-api";

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
          : "I couldn't find any relevant information in your documents to answer that question. Please try asking something else or upload a document that might contain the information you're looking for.";
        
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
    
    // Close sidebar on mobile when file is selected
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    
    // If no file selected, we're done
    if (!fileName) {
      return;
    }
    
    // If file selected, let the useEffect handle initialization
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTestAPI = async () => {
    const result = await testAPI();
    alert(result);
  };

  const handleTestDocument = async () => {
    if (!selectedFile || !user?.id) {
      alert("Please select a file first");
      return;
    }
    
    // Test document loading
    const document = await getDocumentByFileName(selectedFile, user.id);
    
    // Test vector search
    if (document) {
      const chunks = await queryRelevantChunks("test question", document.id);
      alert(`Document found: ${document.name}\nChunks found: ${chunks.length}`);
    } else {
      alert("Document not found in database");
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
    <div className="h-screen bg-gray-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DC</span>
            </div>
            <div>
              <h1 className="font-semibold text-white">Document Chat</h1>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } md:w-80 w-full md:relative fixed inset-y-0 left-0 z-50 bg-gray-800 border-r border-gray-700 transition-transform duration-300 flex flex-col`}>
        {/* Desktop Header */}
        <div className="hidden md:block p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <div>
                <h1 className="font-semibold text-white">Document Chat</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Header with Back Button */}
        <div className="md:hidden p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <div>
                <h1 className="font-semibold text-white">Document Chat</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

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
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleTestAPI}
            className="w-full px-3 py-2 text-sm text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Test API
          </button>
          <button
            onClick={handleTestDocument}
            className="w-full px-3 py-2 text-sm text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
          >
            Test Document
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Sign Out
          </button>
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
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
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

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isInitializing ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">Loading document...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">Select a document to start chatting</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'ai' && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[70%] ${msg.type === 'user' ? 'order-1' : 'order-2'}`}>
                  <div className={`rounded-lg p-3 ${
                    msg.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-white'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {msg.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">U</span>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="max-w-[85%] sm:max-w-[70%]">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
  );
};

export default Page;
