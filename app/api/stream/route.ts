import { NextRequest, NextResponse } from 'next/server';
import fetchAnswer from '@/server/ai-model';
import { saveMessage } from '@/server/server.actions';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chunks, chatMessage, threadMessages } = await request.json();

    if (!sessionId || !chunks || !chatMessage) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const stream = await fetchAnswer(chunks, chatMessage, threadMessages, true);
    
    const encoder = new TextEncoder();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    let fullResponse = "";
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Save the complete response to database
              await saveMessage({
                sessionId,
                role: "ai",
                content: fullResponse,
              });
              break;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  // Save the complete response to database
                  await saveMessage({
                    sessionId,
                    role: "ai",
                    content: fullResponse,
                  });
                  controller.close();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content;
                    // Send the chunk to the client
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  console.error(e)
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 