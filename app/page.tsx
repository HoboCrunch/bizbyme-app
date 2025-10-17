'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState('');
  const [business, setBusiness] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor
  useEffect(() => {
    if (!isLoading) {
      setShowCursor(true);
      return;
    }

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [isLoading]);

  const exampleSearches = [
    { zip: '10001', business: 'Tech startup founder' },
    { zip: '90210', business: 'Real estate investor' },
    { zip: '60601', business: 'Marketing consultant' },
  ];

  const handleExampleClick = (example: { zip: string; business: string }) => {
    setZipCode(example.zip);
    setBusiness(example.business);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!zipCode || !business) {
      return;
    }

    setIsLoading(true);
    setTypedText('');

    const statusMessages = [
      'Initializing search...',
      'Connecting to AI search...',
      'Searching for events...',
      'Finding networking opportunities...',
      'Analyzing event relevance...',
      'Compiling results...',
    ];

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setTypedText(statusMessages[statusIndex]);
        statusIndex++;
      }
    }, 1500);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zipCode, business }),
      });

      clearInterval(statusInterval);

      if (!response.ok) {
        throw new Error('Failed to search for events');
      }

      const result = await response.json();

      if (result.results) {
        sessionStorage.setItem('searchResults', JSON.stringify(result.results));
        sessionStorage.setItem('searchParams', JSON.stringify({ zipCode, business }));
        router.push('/results');
      } else {
        setTypedText('No events found. Try a different search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      clearInterval(statusInterval);
      setTypedText('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col animate-fadeIn">
      {/* Minimal Header */}
      <header className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
          <Image
            src="/bizbyme-logo.png"
            alt="Biz By Me"
            width={32}
            height={32}
            className="rounded-full"
          />
          <h1 className="text-base md:text-lg font-normal tracking-tight">Biz By Me</h1>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12">
        <div className="w-full max-w-3xl space-y-8">
          {/* Headline */}
          <div className="text-center space-y-3 mb-12 md:mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-tight">
              Find your next
            </h2>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              opportunity
            </h2>
            <p className="text-gray-400 text-base sm:text-lg md:text-xl mt-4 md:mt-6 font-light">
              Discover networking events tailored to your business
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="relative"
          >
            <div className={`
              flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0
              bg-[#2a2a2a] rounded-2xl md:rounded-full p-2 md:p-1.5
              border transition-all duration-200
              ${isFocused ? 'border-gray-500 shadow-[0_0_0_3px_rgba(75,85,99,0.1)]' : 'border-gray-700'}
              ${isLoading ? 'opacity-70' : ''}
            `}>
              <input
                type="text"
                placeholder="Zip Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full md:w-28 bg-transparent px-4 py-3.5 md:py-2.5 outline-none text-white placeholder-gray-500 text-base"
                disabled={isLoading}
              />
              <div className="hidden md:block w-px h-6 bg-gray-600"></div>
              <input
                type="text"
                placeholder="Describe your business"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-[2] bg-transparent px-4 py-3.5 md:py-2.5 outline-none text-white placeholder-gray-500 text-base"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !zipCode || !business}
                className={`
                  bg-white text-black px-6 py-3.5 md:px-7 md:py-2.5 rounded-xl md:rounded-full
                  font-medium transition-all duration-200 text-base
                  hover:bg-gray-100 active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  min-h-[44px] w-full md:w-auto
                  touch-manipulation
                  ${isLoading ? 'animate-pulse' : ''}
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    Searching
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </div>

            {/* Typewriter Loading Message */}
            {isLoading && (
              <div className="mt-4 text-center min-h-[24px]">
                <span className="text-gray-400 text-sm">
                  {typedText}
                  <span className={`inline-block w-0.5 h-4 bg-gray-400 ml-0.5 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
                </span>
              </div>
            )}
          </form>

          {/* Example Searches */}
          {!zipCode && !business && (
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-6 md:mt-8 animate-fadeIn">
              <span className="text-xs md:text-sm text-gray-500 w-full text-center md:w-auto">Try:</span>
              {exampleSearches.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="
                    px-3 py-2.5 md:px-4 md:py-2 rounded-full
                    bg-white/5 border border-gray-700
                    hover:bg-white/10 hover:border-gray-600
                    transition-all duration-200 hover:scale-105
                    text-xs md:text-sm text-gray-300
                    min-h-[44px] flex items-center
                  "
                >
                  <span className="whitespace-nowrap">{example.zip} · {example.business}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-4 md:p-6 lg:p-8">
        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm group min-h-[44px]">
          <span className="text-lg group-hover:scale-110 transition-transform">?</span>
          <span>About</span>
        </button>
      </footer>
    </div>
  );
}
