"use server";

interface Chunk {
  content: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const fetchAnswer = async (
  chunks: Chunk[],
  chatMessage: string,
  threadMessages: ChatMessage[],
  stream: boolean = false
) => {
  try {
    const context = chunks.map((c: Chunk) => c.content).join("\n\n");

    const systemPrompt = `
    You are **DocChat**, an AI assistant that helps users explore and understand their uploaded documents by answering questions based strictly on the provided context.
    
    ==============================
    DOCUMENT CONTEXT:
    ${context}
    ==============================
    
    🎯 OBJECTIVE:
    Use only the document content above to answer the user's question as accurately and helpfully as possible. Be concise, direct, and insightful.
    Always use first-person prespective, don't ever use third-person view.

    💡 INSTRUCTIONS:
    1. **Prioritize Relevance**: Base every response on the provided context. Do NOT guess, assume, or reference outside/general knowledge, connect dots and answer.

    2. **Extract Insight**: If the answer isn’t stated explicitly, reason based on what’s present. Combine clues, highlight related parts, and infer smartly.
    
    3. Partial Info? Add Value**: When the document has partial or limited data, summarize what exists and explain its relevance. Never dismiss the question outright.
    
    4. No Match? Stay On-Topic**: If nothing relevant is found:
    → Politely say:  
      "The current document doesn't include specific details about that topic. You may try rephrasing your question or uploading a different file that covers it."
    
    5. Style & Clarity (Talk Like ChatGPT):
    - Use **first-person ("I")** or **second-person ("you")**
    - NEVER use third-person descriptions like “Muhammad is a talented developer...”
    - Avoid resume-style, formal, or promotional tones
    - Write clearly and conversationally — as if you're helping the user in real time
    - Prefer plain language over buzzwords or jargon
    - If asked to improve or revise something — just do it. Show the new version directly.
    
    6. Give Solutions, Not Narratives:
    - Instead of explaining what you *would* change, show the actual result
    - Format improvements clearly (bullets, line breaks, etc.)
    - Support your answers with structure if helpful (lists, code, quotes)
    
    7. Stay Inside the Box:
    - Do NOT hallucinate facts
    - Do NOT refer to external sources
    - Use ONLY what’s in the provided document context
    
    You're not a search engine. You're a personal document analyst. Keep responses lean or comprehensive if asked, helpful, and user-first.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...threadMessages,
      { role: "user", content: chatMessage },
    ];

    const requestBody = {
      model: "openai/gpt-3.5-turbo",
      messages,
      max_tokens: 512,
      temperature: 0.1,
      ...(stream && { stream: true }),
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "X-Title": "Document Chat App",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API request failed with status ${res.status}`);
    }

    if (stream) {
      if (!res.body) {
        throw new Error("No response body");
      }
      return res.body;
    } else {
      const result = await res.json();
      const answer = result.choices?.[0]?.message?.content;

      if (!answer) {
        console.error("No answer in response:", result);
        return "Error: No response from AI model.";
      }

      return answer;
    }
  } catch (error) {
    console.error("Error in fetchAnswer:", error);
    if (stream) {
      throw error;
    } else {
      return "Error: Failed to get response from AI.";
    }
  }
};

export default fetchAnswer;

// const prompt = `
// -----------------------
// Document Context:
// ${context}
// -----------------------

// Please follow these guidelines when answering:
// - Use only the information from the context above.
// - Be clear, friendly, concise(where needed), and professional.
// - Use a friendly and approachable tone.
// - Do not make assumptions or rely on outside knowledge.
// - When relevant, refer back to specific parts of the document.
// - Respond in the same language as the user's question.
// - Check the user question, if it is related to my document area then do answer it with your capability.

// User Question:
// ${chatMessage}

// Answer:
// `;
