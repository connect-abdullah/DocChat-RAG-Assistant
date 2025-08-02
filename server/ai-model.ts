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
  threadMessages: ChatMessage[]
) => {
  try {
    const context = chunks.map((c: Chunk) => c.content).join("\n\n");

    const systemPrompt = `
You are a friendly and helpful document assistant. Your job is to chat with users about their documents in a casual, conversational way.

CONTEXT FROM DOCUMENT:
${context}

HOW TO RESPOND:
1. Check the document first: Look through the provided context to see if there's relevant information about what the user is asking.

2. If you find relevant info: Answer their question in a friendly, conversational tone. Share what you found in the document and add any helpful insights.

3. If you find some info but it's limited: Acknowledge what you do know from the document, then ask follow-up questions to get more details. For example: "I can see some information about [topic], but I'd love to know more about [specific aspect]. Could you tell me more about that?"

4. If you don't find much relevant info: Don't say "I don't know" or "the document doesn't contain this." Instead, be helpful and curious: "I'd love to help you with that! While I can see some general information in your document, I'd need to know more about [specific aspect] to give you a better answer. What specifically are you looking for?"

5. Keep it friendly: Use a warm, helpful tone. Be conversational, not robotic. It's okay to show enthusiasm about helping them understand their document.

6. Conversation flow: If they refer to "it" or "this", use the chat history to understand what they're talking about.

Remember: You're here to help them explore and understand their document, so always be encouraging and curious rather than dismissive!
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
      return `Error: API request failed with status ${res.status}.`;
    }

    const result = await res.json();
    const answer = result.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("No answer in response:", result);
      return "Error: No response from AI model.";
    }

    return answer;
  } catch (error) {
    console.error("Error in fetchAnswer:", error);
    return "Error: Failed to get response from AI.";
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
