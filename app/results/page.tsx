'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Event {
  title: string;
  date: string;
  time?: string;
  location?: string;
  distance?: string;
  description: string;
  relevance_score?: string;
  registration_url?: string;
  link?: string; // Backward compatibility
  organizer?: string;
  tags?: string[];
}

type SortOption = 'date' | 'distance' | 'relevance';

export default function ResultsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchParams, setSearchParams] = useState<{ zipCode: string; business: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  useEffect(() => {
    const resultsData = sessionStorage.getItem('searchResults');
    const paramsData = sessionStorage.getItem('searchParams');

    if (resultsData && paramsData) {
      setEvents(JSON.parse(resultsData));
      setSearchParams(JSON.parse(paramsData));
    }
    setLoading(false);
  }, []);

  // Filter out past events and sort
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const upcomingEvents = events.filter(event => {
    if (!event.date) return true; // Keep events without dates
    const eventDate = new Date(event.date);
    return eventDate >= today; // Only keep events today or in the future
  });

  const sortedEvents = [...upcomingEvents].sort((a, b) => {
    if (sortBy === 'date') {
      // Sort by date (soonest upcoming first)
      const dateA = new Date(a.date || '9999-12-31');
      const dateB = new Date(b.date || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    } else if (sortBy === 'distance') {
      // Sort by distance (closest first)
      const distanceA = parseFloat(a.distance?.replace(/[^\d.]/g, '') || '9999');
      const distanceB = parseFloat(b.distance?.replace(/[^\d.]/g, '') || '9999');
      return distanceA - distanceB;
    } else if (sortBy === 'relevance') {
      // Sort by relevance score (High > Medium > General)
      const scoreMap = { 'High': 0, 'Medium': 1, 'General': 2 };
      const scoreA = scoreMap[a.relevance_score as keyof typeof scoreMap] ?? 3;
      const scoreB = scoreMap[b.relevance_score as keyof typeof scoreMap] ?? 3;
      return scoreA - scoreB;
    }
    return 0;
  });

  const loadMoreEvents = async () => {
    if (!searchParams || loadingMore) return;

    // Find the latest date from current events
    let latestDate: Date | null = null;
    events.forEach(event => {
      if (event.date) {
        const eventDate = new Date(event.date);
        if (!latestDate || eventDate > latestDate) {
          latestDate = eventDate;
        }
      }
    });

    if (!latestDate) return;

    setLoadingMore(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipCode: searchParams.zipCode,
          business: searchParams.business,
          afterDate: (latestDate as Date).toISOString().split('T')[0], // Format as YYYY-MM-DD
        }),
      });

      const data = await response.json();

      if (response.ok && data.results) {
        // Append new results to existing events
        const newEvents = [...events, ...data.results];
        setEvents(newEvents);
        sessionStorage.setItem('searchResults', JSON.stringify(newEvents));
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-lg md:text-xl text-gray-400 text-center">No events found</p>
        <Link
          href="/"
          className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors min-h-[44px] flex items-center text-sm md:text-base"
        >
          Try Another Search
        </Link>
      </div>
    );
  }

  // Check if all events were filtered out as past events
  if (sortedEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-lg md:text-xl text-gray-400 text-center">No upcoming events found</p>
        <p className="text-sm text-gray-500 text-center">All events in this search have already passed</p>
        <Link
          href="/"
          className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors min-h-[44px] flex items-center text-sm md:text-base"
        >
          Try Another Search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-gray-800 backdrop-blur-sm bg-opacity-95">
        <div className="p-3 md:p-4 lg:p-6 flex items-center justify-between gap-2 md:gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <Image
              src="/bizbyme-logo.png"
              alt="Biz By Me Logo"
              width={28}
              height={28}
              className="rounded-full md:w-8 md:h-8"
            />
            <h1 className="text-base md:text-lg font-normal hidden sm:block">Biz By Me</h1>
          </Link>

          {searchParams && (
            <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-light text-center flex-1 px-2 md:px-4 leading-tight">
              Events Near <span className="font-medium">{searchParams.zipCode}</span>
            </h2>
          )}

          <Link
            href="/"
            className="flex items-center gap-1.5 md:gap-2 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 px-3 md:px-4 py-2.5 md:py-2 rounded-full transition-all text-xs md:text-sm shrink-0 min-h-[44px]"
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden sm:inline">New Search</span>
          </Link>
        </div>
      </header>

      {/* Sort Controls */}
      <div className="border-b border-gray-800 bg-[#1a1a1a]/50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
          <span className="text-xs md:text-sm text-gray-400">Sort:</span>
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 md:px-3.5 py-2 md:py-1.5 rounded-full text-xs font-medium transition-all min-h-[44px] md:min-h-0 ${
                sortBy === 'date'
                  ? 'bg-white text-black'
                  : 'bg-white/5 border border-gray-700 hover:bg-white/10 hover:border-gray-600'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setSortBy('distance')}
              className={`px-3 md:px-3.5 py-2 md:py-1.5 rounded-full text-xs font-medium transition-all min-h-[44px] md:min-h-0 ${
                sortBy === 'distance'
                  ? 'bg-white text-black'
                  : 'bg-white/5 border border-gray-700 hover:bg-white/10 hover:border-gray-600'
              }`}
            >
              Distance
            </button>
            <button
              onClick={() => setSortBy('relevance')}
              className={`px-3 md:px-3.5 py-2 md:py-1.5 rounded-full text-xs font-medium transition-all min-h-[44px] md:min-h-0 ${
                sortBy === 'relevance'
                  ? 'bg-white text-black'
                  : 'bg-white/5 border border-gray-700 hover:bg-white/10 hover:border-gray-600'
              }`}
            >
              Relevance
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="grid gap-4 md:gap-6">
          {sortedEvents.map((event, index) => (
            <EventCard key={index} event={event} />
          ))}
        </div>

        {/* Load More Button */}
        {sortedEvents.length > 0 && (
          <div className="mt-8 md:mt-12 flex justify-center">
            <button
              onClick={loadMoreEvents}
              disabled={loadingMore}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 px-5 py-3 md:px-6 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm md:text-base"
            >
              {loadingMore ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Loading more events...</span>
                  <span className="sm:hidden">Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">Search for more events near me</span>
                  <span className="sm:hidden">Load More</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>Found {sortedEvents.length} upcoming event{sortedEvents.length !== 1 ? 's' : ''}</p>
      </footer>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const link = event.registration_url || event.link;

  // Extract just city from location (e.g., "Venue Name, City, State" -> "City")
  const getShortLocation = (location: string) => {
    const parts = location.split(',').map(s => s.trim());
    return parts.length > 1 ? parts[parts.length - 2] : parts[0];
  };

  // Format distance to be simpler
  const getDistance = (distance: string) => {
    if (!distance) return null;
    // If it already says "miles from zipcode", convert to "miles away"
    return distance.replace(/miles from.*/, 'miles away').replace(/(\d+)\s*miles.*/, '$1 mi');
  };

  return (
    <div className="bg-[#2a2a2a] border border-gray-700 rounded-xl p-4 md:p-5 hover:border-gray-600 transition-all duration-200">
      <div className="flex flex-col gap-3 md:gap-3.5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start sm:items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-base md:text-lg font-semibold text-white leading-snug">
                {event.title}
              </h3>
              {event.relevance_score && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                  ${event.relevance_score === 'High' ? 'bg-green-500/20 text-green-400' :
                    event.relevance_score === 'Medium' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'}
                `}>
                  {event.relevance_score}
                </span>
              )}
            </div>
            {event.organizer && (
              <p className="text-xs md:text-sm text-gray-400">
                {event.organizer}
              </p>
            )}
          </div>

          {/* Distance badge */}
          {event.distance && (
            <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
              {getDistance(event.distance)}
            </span>
          )}
        </div>

        {/* Event Details */}
        <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-xs md:text-sm text-gray-400">
          {event.date && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="break-words">{event.date}{event.time && ` • ${event.time}`}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="break-words">{getShortLocation(event.location)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Tags and Register button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-white/5 border border-gray-700 rounded-full text-xs text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Register button */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-gray-600 px-4 py-2.5 md:py-2 rounded-full transition-all text-sm font-medium sm:ml-auto min-h-[44px]"
            >
              Register
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
