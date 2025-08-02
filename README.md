# 📄 DocChat - AI-Powered Document Assistant

> **Transform your documents into intelligent conversations** 🚀

DocChat is an AI-powered document assistant that lets you instantly chat with your files. Upload PDFs, Word documents, or text files — ask questions, get precise answers, and extract insights in seconds using advanced embeddings and natural language processing. Built for professionals, researchers, and teams that need fast, context-aware understanding of their documents.

## ✨ Features

### 🔍 **Advanced Document Processing**
- **Multi-format Support**: Upload PDFs, DOCX files, and text documents
- **Intelligent Text Extraction**: Advanced parsing with `pdf2json` and `mammoth` libraries
- **Smart Chunking**: Intelligent text segmentation for optimal context retrieval
- **Vector Embeddings**: Transform documents into searchable vector representations

### 🤖 **AI-Powered Conversations**
- **RAG (Retrieval-Augmented Generation)**: Combines document retrieval with AI generation
- **Context-Aware Responses**: AI understands document context and provides relevant answers
- **Conversation Memory**: Maintains chat history and session continuity
- **Natural Language Processing**: Understands complex queries and provides human-like responses

### 🔐 **Secure & Scalable**
- **User Authentication**: Supabase-powered authentication system
- **File Storage**: Secure cloud storage with Supabase Storage
- **Session Management**: Persistent chat sessions across browser sessions
- **Real-time Updates**: Live chat interface with instant responses

### 📱 **Modern UI/UX**
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Theme**: Modern, eye-friendly dark interface
- **Real-time Feedback**: Toast notifications and loading states
- **Intuitive Navigation**: Sidebar file management and chat interface

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hot Toast** - User notifications
- **Lucide React** - Beautiful icons

### **Backend & AI**
- **Supabase** - Database, authentication, and storage
- **OpenRouter API** - GPT-3.5-turbo integration
- **Xenova Transformers** - Local embedding generation
- **Vector Search** - Semantic document retrieval

### **Document Processing**
- **pdf2json** - PDF text extraction
- **mammoth** - DOCX document parsing
- **Custom Chunking** - Intelligent text segmentation
- **Embedding Pipeline** - All-MiniLM-L6-v2 model

### **Database & Storage**
- **PostgreSQL** - Primary database (via Supabase)
- **pgvector** - Vector similarity search
- **Supabase Storage** - File upload and management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account
- OpenRouter API key

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd supabase-foundation
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Environment Setup**
Create a `.env.local` file with your configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. **Database Setup**
Set up your Supabase database with the required tables:
- `documents` - Document metadata and text content
- `vectors` - Vector embeddings for semantic search
- `sessions` - Chat session management
- `messages` - Chat message history

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application!

## 🏗️ Architecture

### **Document Processing Pipeline**
```
Upload → Parse → Chunk → Embed → Store → Query → RAG → Response
```

1. **Upload**: User uploads PDF/DOCX file
2. **Parse**: Extract text using specialized parsers
3. **Chunk**: Split text into semantic chunks (600 chars max)
4. **Embed**: Generate vector embeddings using All-MiniLM-L6-v2
5. **Store**: Save chunks and embeddings to PostgreSQL with pgvector
6. **Query**: Semantic search for relevant chunks
7. **RAG**: Combine chunks with AI for context-aware responses

### **Vector Search Implementation**
- **Embedding Model**: All-MiniLM-L6-v2 (384 dimensions)
- **Similarity**: Cosine similarity with 0.15 threshold
- **Retrieval**: Top 5 most relevant chunks per query
- **Context**: Document-specific search with session management

### **AI Integration**
- **Model**: GPT-3.5-turbo via OpenRouter
- **Context Window**: 512 tokens max
- **Temperature**: 0.1 for consistent responses
- **System Prompt**: Optimized for document assistance

## 📊 Key Features Explained

### **RAG (Retrieval-Augmented Generation)**
DocChat implements a sophisticated RAG system:
- **Semantic Search**: Uses vector embeddings to find relevant document chunks
- **Context Assembly**: Combines retrieved chunks with user query
- **AI Generation**: GPT-3.5-turbo generates responses based on document context
- **Conversation Memory**: Maintains chat history for contextual understanding

### **Vector Search**
- **Local Embeddings**: Uses Xenova Transformers for client-side embedding generation
- **pgvector Integration**: PostgreSQL extension for efficient vector similarity search
- **Threshold-based Retrieval**: Only returns chunks above similarity threshold
- **Document Isolation**: Search within specific documents or across all documents

### **Session Management**
- **Persistent Sessions**: Chat sessions persist across browser sessions
- **Document Context**: Each session is tied to a specific document
- **Message History**: Maintains conversation context for better AI responses
- **Session Reuse**: Automatically resumes existing sessions for documents

## 🔧 Configuration

### **Environment Variables**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Customize AI model
AI_MODEL=openai/gpt-3.5-turbo
```

### **Database Schema**
```sql
-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  ext TEXT NOT NULL,
  text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vectors table for embeddings
CREATE TABLE vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  content TEXT NOT NULL,
  embedding vector(384),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  document_id UUID REFERENCES documents(id),
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment

### **Vercel Deployment**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### **Supabase Setup**
1. Create a new Supabase project
2. Enable pgvector extension
3. Run database migrations
4. Configure storage buckets for file uploads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service
- **OpenRouter** for seamless AI model access
- **Xenova** for client-side transformer models
- **Next.js** team for the incredible React framework
- **Vercel** for seamless deployment

---

**Built with ❤️ for the developer community**

*AI Powered by: https://openrouter.ai/openai/gpt-3.5-turbo*