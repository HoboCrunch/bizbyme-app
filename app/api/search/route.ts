import { NextRequest, NextResponse } from 'next/server';

interface Event {
  title: string;
  date: string;
  time?: string;
  location?: string;
  distance?: string;
  description: string;
  relevance_score?: string;
  registration_url?: string;
  organizer?: string;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { zipCode, business, afterDate } = await request.json();

    if (!zipCode || !business) {
      return NextResponse.json(
        { error: 'Zip code and business description are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // System prompt from system-prompt.md
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

CRITICAL INSTRUCTIONS:
- You MUST return events in JSON format. Do NOT apologize or say you cannot find events.
- Search Eventbrite, Meetup.com, chamber of commerce sites, industry association calendars, and other event platforms.
- If you cannot find exact dates for some events, include them anyway with approximate timing or recurring information.
- Cast a wide net - include nearby cities within the 100 mile radius if needed.
- For distance: Calculate actual distance from zip code to venue. For same zip code, use 1-4 miles.

Return 10-20 events in this EXACT JSON format:
{
  "search_location": "City, State (Zip Code)",
  "search_radius": "100 miles",
  "business_focus": "Brief summary of user's business",
  "events": [
    {
      "title": "Event Name",
      "date": "Month DD, YYYY",
      "time": "Start Time - End Time",
      "location": "Venue Name, City, State",
      "distance": "XX miles",
      "description": "2-3 sentence description highlighting why this event is relevant",
      "relevance_score": "High, Medium, or General",
      "registration_url": "Direct URL to event page",
      "organizer": "Organization hosting the event",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Sort by: 1) Date (sooner first), 2) Distance (closer first). Use real event data from current sources.`;

    // User prompt
    const dateConstraint = afterDate ? ` AFTER ${afterDate}` : '';
    const userPrompt = `Find business networking events for:
- Zip Code: ${zipCode}
- Business: ${business}${dateConstraint ? `\n- Time period: Events happening${dateConstraint}` : ''}

Return results in JSON format as specified in your system prompt.`;

    // Call Perplexity API (non-streaming)
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 5000,
        stream: false, // Disable streaming
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perplexity API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to search for events' },
        { status: response.status }
      );
    }

    // Handle non-streaming response
    const data = await response.json();
    const fullContent = data.choices[0]?.message?.content || '';

    // Parse the complete response
    console.log('=== RAW PERPLEXITY RESPONSE ===');
    console.log(`Content length: ${fullContent.length} chars`);
    console.log('First 2000 chars:');
    console.log(fullContent.substring(0, 2000));
    console.log('=== END RAW RESPONSE ===');

    const events = parseEventsFromResponse(fullContent);

    console.log('=== PARSED EVENTS ===');
    console.log(`Found ${events.length} events`);
    if (events.length > 0) {
      console.log('First event:', JSON.stringify(events[0], null, 2));
    }

    return NextResponse.json({
      results: events,
      rawResponse: fullContent,
      searchParams: { zipCode, business },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while searching for events' },
      { status: 500 }
    );
  }
}

// Helper function to filter events by distance
function filterEventsByDistance(events: Event[]): Event[] {
  console.log(`Filtering ${events.length} events by distance...`);
  const filtered = events.filter(event => {
    if (!event.distance) {
      console.log(`Event "${event.title}" has no distance, keeping it`);
      return true; // Keep events without distance info
    }

    // Extract numeric distance value
    const distanceMatch = event.distance.match(/(\d+(?:\.\d+)?)/);
    if (!distanceMatch) {
      console.log(`Event "${event.title}" distance unparseable (${event.distance}), keeping it`);
      return true; // Keep if we can't parse distance
    }

    const distanceValue = parseFloat(distanceMatch[1]);
    const keep = distanceValue <= 100;
    console.log(`Event "${event.title}" is ${distanceValue} miles - ${keep ? 'keeping' : 'filtering out'}`);
    return keep; // Only keep events 100 miles or less
  });
  console.log(`After distance filter: ${filtered.length} events remain`);
  return filtered;
}

function parseEventsFromResponse(content: string): Event[] {
  try {
    // Try to extract JSON from the response
    console.log('Attempting JSON parsing...');
    const jsonMatch = content.match(/\{[\s\S]*"events"[\s\S]*\}/);
    if (jsonMatch) {
      console.log('Found JSON structure in response');
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.events && Array.isArray(parsed.events)) {
        console.log(`Extracted ${parsed.events.length} events from JSON`);
        const events = parsed.events.map((event: any) => ({
          title: event.title || '',
          date: event.date || '',
          time: event.time,
          location: event.location,
          distance: event.distance,
          description: event.description || '',
          relevance_score: event.relevance_score,
          registration_url: event.registration_url,
          organizer: event.organizer,
          tags: event.tags || [],
        }));
        return filterEventsByDistance(events);
      } else {
        console.log('JSON parsed but no events array found');
      }
    } else {
      console.log('No JSON structure found in response');
    }
  } catch (e) {
    console.error('JSON parsing failed, falling back to text parsing:', e);
  }

  // Fallback to text parsing if JSON parsing fails
  console.log('Using text parsing fallback...');
  return filterEventsByDistance(parseEventsFromText(content));
}

function parseEventsFromText(content: string): Event[] {
  const events: Event[] = [];
  const lines = content.split('\n');
  let currentEvent: Partial<Event> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Look for event titles (usually numbered or bulleted)
    if (line.match(/^\d+\.|^-|^\*/) && !line.includes('Date') && !line.includes('Link')) {
      if (currentEvent.title) {
        events.push(currentEvent as Event);
      }
      currentEvent = {
        title: line.replace(/^\d+\.|^-|^\*/, '').trim().replace(/\*\*/g, ''),
        date: '',
        description: '',
        tags: [],
      };
    } else if (line.toLowerCase().includes('date:')) {
      currentEvent.date = line.replace(/^.*date:/i, '').replace(/^-|^\*/, '').trim();
    } else if (line.toLowerCase().includes('time:')) {
      currentEvent.time = line.replace(/^.*time:/i, '').replace(/^-|^\*/, '').trim();
    } else if (line.toLowerCase().includes('location:')) {
      currentEvent.location = line.replace(/^.*location:/i, '').replace(/^-|^\*/, '').trim();
    } else if (line.toLowerCase().includes('http') || line.includes('www.')) {
      const urlMatch = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
      if (urlMatch) {
        currentEvent.registration_url = urlMatch[0];
      }
    } else if (currentEvent.title && !currentEvent.description && line.length > 20) {
      currentEvent.description = line.replace(/^Description:/i, '').trim();
    }
  }

  if (currentEvent.title) {
    events.push(currentEvent as Event);
  }

  return events.filter(event => event.title && (event.date || event.description));
}
