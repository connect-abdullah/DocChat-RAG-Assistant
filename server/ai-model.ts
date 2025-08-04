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

💡 INSTRUCTIONS:
1. **Prioritize Relevance**: Use only information from the context. Do not guess, assume, or generate unrelated information.

2. **Extract Insight**: Even if the answer isn't explicitly stated, attempt to infer a helpful response based on what's present. Be smart and resourceful — connect ideas, rephrase explanations, and highlight partial matches.

3. **Partial Info? Add Value**: If the document has related but incomplete information, clearly summarize what's available and explain how it's relevant.

4. **No Match? Stay On-Topic**: If there's truly no helpful info in the context, don't say "I don't know" or "not available." Instead, respond politely with:
→ "The current document doesn't include specific details about that topic. You may try rephrasing your question or uploading a different file that covers it."

5. **Tone & Clarity**:
- Be friendly, natural, and informative
- Use simple language and structured formatting where helpful
- Avoid robotic, vague, or overly cautious replies

6. **Focus**:
- Only use information found in the context block
- Do NOT make up facts or refer to general knowledge
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
