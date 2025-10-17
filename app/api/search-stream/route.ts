import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { zipCode, business, afterDate } = await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiKey = process.env.PERPLEXITY_API_KEY;

        if (!apiKey) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'API key not configured' })}\n\n`));
          controller.close();
          return;
        }

        // Send initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Initializing search...' })}\n\n`));

        const timeframeText = afterDate
          ? `Search for events within 100 miles of the provided zip code, focusing on events happening AFTER ${afterDate}. Look for events in the next 60 days from that date.`
          : `Search for events within 100 miles of the provided zip code, focusing on events happening in the next 60 days.`;

        const systemPrompt = `You are a business event discovery assistant that helps professionals find networking opportunities, conferences, workshops, and business development events in their area.

${timeframeText} Include:
- Events directly related to the user's industry or business type
- General business networking events (Chamber of Commerce, business associations, entrepreneur meetups)
- Professional development workshops and seminars
- Trade shows, conferences, and industry gatherings
- Cross-industry networking events (valuable for all business professionals)

Return up to 20 events in valid JSON format with title, date, time, location, distance, description, relevance_score, registration_url, organizer, and tags for each event.`;

        const dateConstraint = afterDate ? ` AFTER ${afterDate}` : '';
        const userPrompt = `Find business networking events for:
- Zip Code: ${zipCode}
- Business: ${business}${dateConstraint ? `\n- Time period: Events happening${dateConstraint}` : ''}

Return results in JSON format.`;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Connecting to AI search...' })}\n\n`));

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 2500,
            stream: true,
          }),
        });

        if (!response.ok) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Search failed' })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Searching for events...' })}\n\n`));

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let lastStatusUpdate = Date.now();

        const statusMessages = [
          'Finding networking opportunities...',
          'Checking local venues...',
          'Discovering business events...',
          'Analyzing event relevance...',
          'Compiling results...',
        ];
        let statusIndex = 0;

        if (reader) {
          let chunkCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunkCount++;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content || '';
                  if (chunkCount <= 3) {
                    console.log(`Chunk ${chunkCount} content:`, content);
                  }
                  fullContent += content;

                  // Send periodic status updates
                  if (Date.now() - lastStatusUpdate > 2000) {
                    if (statusIndex < statusMessages.length) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'status',
                        message: statusMessages[statusIndex]
                      })}\n\n`));
                      statusIndex++;
                      lastStatusUpdate = Date.now();
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Processing results...' })}\n\n`));

        console.log('=== STREAM COMPLETE ===');
        console.log(`Total content length: ${fullContent.length} chars`);
        console.log('First 1000 chars:');
        console.log(fullContent.substring(0, 1000));
        console.log('Last 500 chars:');
        console.log(fullContent.substring(Math.max(0, fullContent.length - 500)));
        console.log('=== END STREAM ===');

        // Send the complete response
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          content: fullContent,
          params: { zipCode, business }
        })}\n\n`));

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred' })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
