"use server"

export async function testAPI() {
  try {
    console.log("Testing API connection...");
    console.log("API Key present:", !!process.env.OPENROUTER_API_KEY);
    
    if (!process.env.OPENROUTER_API_KEY) {
      return "Error: OPENROUTER_API_KEY is not set in environment variables";
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Document Chat App",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Hello, this is a test message." }
        ],
        max_tokens: 50,
      }),
    });

    console.log("Test response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Test API Error:", errorText);
      return `API test failed with status ${response.status}: ${errorText}`;
    }

    const result = await response.json();
    console.log("Test API success:", result);
    return "API connection successful!";
    
  } catch (error) {
    console.error("Test API error:", error);
    return `API test error: ${error}`;
  }
} 