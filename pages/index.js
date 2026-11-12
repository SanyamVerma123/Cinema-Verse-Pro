import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function MovieDiscoveryPortal({
  initialTrending = [],
  initialPopular = [],
  initialTopRated = [],
  initialNowPlaying = [],
  initialUpcoming = []
}) {
  // Navigation & Catalog States
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'movies' | 'tv' | 'watchlist' | 'search'
  const [trendingTimeframe, setTrendingTimeframe] = useState('day'); // 'day' | 'week'
  const [trendingItems, setTrendingItems] = useState(initialTrending);
  const [popularItems, setPopularItems] = useState(initialPopular);
  const [topRatedItems, setTopRatedItems] = useState(initialTopRated);
  const [nowPlayingItems, setNowPlayingItems] = useState(initialNowPlaying);
  const [upcomingItems, setUpcomingItems] = useState(initialUpcoming);
  const [tvItems, setTvItems] = useState([]);
  const [genreList, setGenreList] = useState([]);

  // Spotlight Hero
  const heroItem = trendingItems[0] || initialTrending[0] || null;

  // Search & Autocomplete States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState({ titles: [], artists: [], genres: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Voice Search States
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('Listening... Speak now');
  const speechRecognitionRef = useRef(null);

  // Details Modal States
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [detailsTab, setDetailsTab] = useState('overview'); // 'overview' | 'videos' | 'photos' | 'cast' | 'reviews' | 'episodes'
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activePlayingVideo, setActivePlayingVideo] = useState(null); // optional inline video ID
  const [activeVideoModal, setActiveVideoModal] = useState(null); // { id, title, type, url } cinema theater video player
  const modalScrollRef = useRef(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  // Photo Lightbox Viewer
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState(null);

  // Person Details Modal
  const [activePerson, setActivePerson] = useState(null);
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);

  // Watchlist State (Local Storage)
  const [watchlist, setWatchlist] = useState([]);

  // Voice/Text Interactive Dialogue State (Akbar Gate System)
  const [dialogueSession, setDialogueSession] = useState(null); // { sessionId, step, prompt, messages: [] }
  const [dialogueInputText, setDialogueInputText] = useState('');

  // Private App Password Gate States
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [gatePasswordInput, setGatePasswordInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [isVerifyingGate, setIsVerifyingGate] = useState(false);
  const [showGatePasswordText, setShowGatePasswordText] = useState(false);
  const gateInputRef = useRef(null);

  // -------------------------------------------------------------
  // PREVENT BACKGROUND SCROLL BLEED ON MODAL OPEN
  // -------------------------------------------------------------
  useEffect(() => {
    const isAnyModalOpen = activeModalItem || activePerson || activeLightboxPhoto || dialogueSession || activeVideoModal || showPasswordGate;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [activeModalItem, activePerson, activeLightboxPhoto, dialogueSession, activeVideoModal, showPasswordGate]);

  // -------------------------------------------------------------
  // INITIALIZATION & KEYBOARD SHORTCUTS
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cp_watchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch (_) {}

    // Fetch genres
    fetch('/api/tmdb/genres/movie')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setGenreList(d.data || []); })
      .catch(() => {});

    // Fetch Popular TV
    fetch('/api/tmdb/popular/tv')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setTvItems(d.data || []); })
      .catch(() => {});

    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !dialogueSession && !showPasswordGate) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
        setActiveModalItem(null);
        setActivePlayingVideo(null);
        setActiveVideoModal(null);
        setActiveLightboxPhoto(null);
        setActivePerson(null);
        setDialogueSession(null);
        setShowPasswordGate(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogueSession, showPasswordGate]);

  // Watchlist Toggle
  const toggleWatchlist = (item) => {
    if (!item || !item.id) return;
    setWatchlist(prev => {
      const exists = prev.some(x => x.id === item.id);
      const next = exists ? prev.filter(x => x.id !== item.id) : [...prev, item];
      try { localStorage.setItem('cp_watchlist', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const isBookmarked = (id) => watchlist.some(x => x.id === id);

  // -------------------------------------------------------------
  // TEXT-TO-SPEECH (SPEAK THROUGH DEVICE SPEAKERS)
  // -------------------------------------------------------------
  const speakAloud = (text, onEnd) => {
    let called = false;
    const safeEnd = () => {
      if (!called) {
        called = true;
        if (onEnd) onEnd();
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = safeEnd;
        utterance.onerror = safeEnd;
        // Safety timeout so execution is never stalled if browser speech synthesis blocks
        setTimeout(safeEnd, 2200);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        safeEnd();
      }
    } else {
      safeEnd();
    }
  };

  // -------------------------------------------------------------
  // MULTI-TURN DIALOGUE HANDLER (AKBAR GATE SEQUENCE)
  // -------------------------------------------------------------
  const handleDialogueInteraction = async (userInputText, currentSessionId = null) => {
    const clean = (userInputText || '').trim();
    if (!clean) return;

    try {
      const res = await fetch('/api/assistant/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean, sessionId: currentSessionId })
      });
      const data = await res.json();

      if (data && data.dialogue) {
        // Step in dialogue matched
        const newSessionId = data.sessionId || currentSessionId;
        const newMessages = dialogueSession ? [...dialogueSession.messages] : [];
        newMessages.push({ sender: 'user', text: clean });
        newMessages.push({ sender: 'assistant', text: data.speech || data.display });

        setDialogueSession({
          sessionId: newSessionId,
          step: data.step,
          prompt: data.speech || data.display,
          messages: newMessages
        });
        setDialogueInputText('');

        // Check if step triggered the Private App Password Gate (after "sim sim khul ja")
        if (data.status === 'password_gate' || data.requirePassword) {
          setDialogueSession(null);
          setShowPasswordGate(true);
          setGatePasswordInput('');
          setGateError('');
          setTimeout(() => {
            gateInputRef.current?.focus();
          }, 150);
          speakAloud(data.speech);
          return true;
        }

        // Speak through speaker
        speakAloud(data.speech, () => {
          // If unlocked, redirect
          if (data.status === 'unlock' && data.redirect) {
            setTimeout(() => {
              window.location.href = data.redirect;
            }, 600);
          } else {
            // Automatically prompt for next utterance if mic was active
            startDialogueVoiceCapture(newSessionId);
          }
        });
        return true;
      }
    } catch (e) {
      console.warn('Dialogue interaction error:', e);
    }
    return false;
  };

  // -------------------------------------------------------------
  // VERIFY PRIVATE APP PASSWORD GATE
  // -------------------------------------------------------------
  const handleVerifyGatePassword = async (e) => {
    if (e) e.preventDefault();
    const pass = (gatePasswordInput || '').trim();
    if (!pass) {
      setGateError('Please enter your configured private password.');
      return;
    }

    setIsVerifyingGate(true);
    setGateError('');

    try {
      const res = await fetch('/api/vault/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: pass })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        speakAloud('Access granted. Welcome to Cinema Verse.', () => {
          window.location.href = data.redirect || '/vault';
        });
      } else {
        const errorMsg = data.message || data.error || 'Incorrect password. Access denied.';
        setGateError(errorMsg);
        speakAloud('Incorrect password.');
        gateInputRef.current?.select();
      }
    } catch (err) {
      setGateError('Verification service error. Please try again.');
    } finally {
      setIsVerifyingGate(false);
    }
  };

  // Voice capture within dialogue session
  const startDialogueVoiceCapture = (sessionId) => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatusText('Listening for reply...');
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleDialogueInteraction(transcript, sessionId);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  // -------------------------------------------------------------
  // UNIFIED SEARCH & COMMAND INTERPRETER
  // -------------------------------------------------------------
  const executeSearch = async (queryText) => {
    const clean = (queryText || searchQuery || '').trim();
    if (!clean) return;

    setShowAutocomplete(false);

    // 1. First test if input triggers the dialogue sequence
    const wasDialogue = await handleDialogueInteraction(clean, dialogueSession ? dialogueSession.sessionId : null);
    if (wasDialogue) {
      return;
    }

    // 2. Otherwise execute TMDB Multi-Search
    setIsSearching(true);
    setActiveTab('search');

    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (data && data.dialogue) {
        handleDialogueInteraction(clean);
        return;
      }

      setSearchResults(data.data || data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // -------------------------------------------------------------
  // SEQUENTIAL VOICE SEARCH
  // -------------------------------------------------------------
  const startVoiceCapture = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.abort(); } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use the search bar.');
      searchInputRef.current?.focus();
      return;
    }

    try {
      const rec = new SpeechRec();
      speechRecognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatusText('Listening... Speak now');
      };

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setSearchQuery(transcript);

        if (event.results[0].isFinal) {
          rec.stop();
          setIsListening(false);
          executeSearch(transcript);
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch (e) {
      console.error('Failed to start voice recognition:', e);
      setIsListening(false);
    }
  };

  // -------------------------------------------------------------
  // AUTOCOMPLETE
  // -------------------------------------------------------------
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val || val.trim().length < 2) {
      setAutocompleteSuggestions({ titles: [], artists: [], genres: [] });
      setShowAutocomplete(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data.status === 'success') {
          setAutocompleteSuggestions({
            titles: data.titles || [],
            artists: data.artists || [],
            genres: data.genres || []
          });
          setShowAutocomplete(true);
        }
      } catch (_) {}
    }, 180);
  };

  // -------------------------------------------------------------
  // OPEN FULL MOVIE / TV DETAILS MODAL
  // -------------------------------------------------------------
  const openMediaDetails = async (item) => {
    if (!item) return;
    setIsLoadingDetails(true);
    setActiveModalItem(item);
    setDetailsTab('overview');
    setSelectedSeason(1);
    setActivePlayingVideo(null);

    const isTv = item.type === 'series' || item.type === 'tv' || !!item.first_air_date;
    const endpoint = isTv ? `/api/tmdb/tv/${item.tmdbId || item.id}` : `/api/tmdb/movie/${item.tmdbId || item.id}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data && data.status === 'success') {
        setActiveModalItem(data);
        if (isTv && data.numberOfSeasons) {
          loadSeasonEpisodes(data.tmdbId || data.id, 1);
        }
      }
    } catch (err) {
      console.error('Failed to load full media details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadSeasonEpisodes = async (tvId, seasonNum) => {
    setIsLoadingSeason(true);
    setSelectedSeason(seasonNum);
    try {
      const res = await fetch(`/api/tmdb/tv/${tvId}/season/${seasonNum}`);
      const data = await res.json();
      if (data.status === 'success') {
        setSeasonEpisodes(data.episodes || []);
      }
    } catch (e) {
      setSeasonEpisodes([]);
    } finally {
      setIsLoadingSeason(false);
    }
  };

  // Open Actor / Director Profile
  const openPersonDetails = async (personId) => {
    if (!personId) return;
    setIsLoadingPerson(true);
    try {
      const res = await fetch(`/api/tmdb/person/${personId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setActivePerson(data);
      }
    } catch (e) {
      console.error('Failed to load person details:', e);
    } finally {
      setIsLoadingPerson(false);
    }
  };

  return (
    <>
      <Head>
        <title>CinePulse — World-Class Cinema & Television Intelligence</title>
        <meta name="description" content="Discover movies, television series, trailers, behind-the-scenes clips, 4K photo galleries, and cast filmographies." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </Head>

      <div className="min-h-screen bg-[#07080c] text-gray-100 font-sans selection:bg-purple-600 selection:text-white">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-15%,rgba(139,92,246,0.14)_0%,transparent_65%)]" />

        {/* ======================================================== */}
        {/* STICKY GLASS NAVIGATION HEADER                          */}
        {/* ======================================================== */}
        <header className="sticky top-0 z-40 bg-[#07080c]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 lg:px-8 py-3.5 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Brand Logo */}
            <div 
              onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0 select-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-compact-disc group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base tracking-tight flex items-center gap-1">
                  CINE<span className="text-purple-400">PULSE</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 -mt-1">Discovery Portal</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-400">
              <button 
                onClick={() => { setActiveTab('home'); }} 
                className={`transition-colors py-1 ${activeTab === 'home' ? 'text-white border-b-2 border-purple-500' : 'hover:text-gray-200'}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setActiveTab('movies'); }} 
                className={`transition-colors py-1 ${activeTab === 'movies' ? 'text-white border-b-2 border-purple-500' : 'hover:text-gray-200'}`}
              >
                Movies
              </button>
              <button 
                onClick={() => { setActiveTab('tv'); }} 
                className={`transition-colors py-1 ${activeTab === 'tv' ? 'text-white border-b-2 border-purple-500' : 'hover:text-gray-200'}`}
              >
                TV Series
              </button>
              <button 
                onClick={() => setActiveTab('watchlist')} 
                className={`transition-colors py-1 flex items-center gap-1.5 ${activeTab === 'watchlist' ? 'text-white border-b-2 border-purple-500' : 'hover:text-gray-200'}`}
              >
                <span>Watchlist</span>
                {watchlist.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                    {watchlist.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Search Input Bar with Microphone */}
            <div className="relative flex-1 max-w-md">
              <form 
                onSubmit={(e) => { e.preventDefault(); executeSearch(); }} 
                className="relative flex items-center"
              >
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 text-gray-400 text-xs pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder={isListening ? voiceStatusText : "Search movies, series, actors... (Press /)"}
                  className={`w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/70 border ${isListening ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/[0.09] focus:border-purple-500'} rounded-full pl-9 pr-14 py-2 text-xs text-white placeholder-gray-400 focus:outline-none transition-all shadow-inner`}
                />
                
                {/* Clear Button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setShowAutocomplete(false); }}
                    className="absolute right-8 text-gray-400 hover:text-white text-xs p-1"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}

                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={startVoiceCapture}
                  title="Voice Search (Click to speak)"
                  className={`absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-purple-600 text-white animate-pulse shadow-lg shadow-purple-500/60 scale-110' 
                      : 'text-purple-400 hover:text-white hover:bg-white/10 active:scale-90'
                  }`}
                >
                  <i className="fa-solid fa-microphone text-xs" />
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && (autocompleteSuggestions.titles.length > 0 || autocompleteSuggestions.artists.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e101a] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 max-h-96 overflow-y-auto custom-scroll">
                  {autocompleteSuggestions.titles.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">Titles</div>
                      {autocompleteSuggestions.titles.map(t => (
                        <div
                          key={t.id || t.tmdbId}
                          onClick={() => { openMediaDetails(t); setShowAutocomplete(false); }}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.07] cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-11 bg-gray-800 rounded overflow-hidden shrink-0">
                            {t.poster && <img src={t.poster} alt={t.title} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{t.title}</div>
                            <div className="text-[11px] text-gray-400">{t.year} • {t.type === 'series' ? 'TV' : 'Movie'}</div>
                          </div>
                          {t.rating && (
                            <span className="text-[11px] font-bold text-amber-400 shrink-0">
                              <i className="fa-solid fa-star text-[9px]" /> {t.rating}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {autocompleteSuggestions.artists.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1 border-t border-white/[0.06] pt-2">Actors & Crew</div>
                      {autocompleteSuggestions.artists.map(a => (
                        <div
                          key={a.id || a.name}
                          onClick={() => { openPersonDetails(a.id); setShowAutocomplete(false); }}
                          className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/[0.07] cursor-pointer transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden shrink-0">
                            <img src={a.profile_path || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}`} alt={a.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">{a.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{a.known_for}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* MAIN BODY: VIEW SWITCHER                                */}
        {/* ======================================================== */}
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">

          {/* TAB: SEARCH RESULTS */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-magnifying-glass text-purple-400 text-sm" />
                    <span>Search Results for "{searchQuery}"</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Found {searchResults.length} matching titles and artists</p>
                </div>
                <button
                  onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-gray-300 font-medium active:scale-95 transition-all"
                >
                  Clear & Return Home
                </button>
              </div>

              {isSearching ? (
                <div className="py-24 text-center text-gray-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-purple-500 mb-3" />
                  <p className="text-xs">Searching global TMDB catalog...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-24 text-center text-gray-400">
                  <i className="fa-solid fa-film text-3xl text-gray-600 mb-3" />
                  <p className="text-sm font-semibold text-gray-300">No matching titles found</p>
                  <p className="text-xs text-gray-500 mt-1">Try another movie title, actor, or genre.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.map(item => (
                    <MediaCard 
                      key={item.id} 
                      item={item} 
                      onOpen={() => item.type === 'person' ? openPersonDetails(item.id) : openMediaDetails(item)}
                      onBookmark={() => toggleWatchlist(item)}
                      isBookmarked={isBookmarked(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: WATCHLIST */}
          {activeTab === 'watchlist' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-bookmark text-purple-400 text-sm" />
                    <span>My Watchlist</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{watchlist.length} saved titles stored in your browser</p>
                </div>
                {watchlist.length > 0 && (
                  <button 
                    onClick={() => { setWatchlist([]); localStorage.removeItem('cp_watchlist'); }}
                    className="text-xs text-red-400 hover:text-red-300 active:scale-95 transition-all"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {watchlist.length === 0 ? (
                <div className="py-28 text-center text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-500 text-xl">
                    <i className="fa-regular fa-bookmark" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Your Watchlist is empty</h3>
                  <p className="text-xs text-gray-500 mt-1">Bookmark movies and TV series to keep track of what to explore.</p>
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
                  >
                    Browse Trending Movies
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {watchlist.map(item => (
                    <MediaCard 
                      key={item.id} 
                      item={item} 
                      onOpen={() => openMediaDetails(item)}
                      onBookmark={() => toggleWatchlist(item)}
                      isBookmarked={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: HOME / MOVIES / TV SHOWS */}
          {(activeTab === 'home' || activeTab === 'movies' || activeTab === 'tv') && (
            <div className="space-y-10">

              {/* SPOTLIGHT HERO BILLBOARD */}
              {heroItem && (
                <div className="relative rounded-3xl overflow-hidden min-h-[420px] md:min-h-[480px] flex items-end p-6 md:p-10 border border-white/[0.08] shadow-2xl bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to top, #07080c 10%, rgba(7,8,12,0.75) 55%, rgba(7,8,12,0.3) 100%), url(${heroItem.backdrop || heroItem.poster})`
                  }}
                >
                  <div className="max-w-2xl relative z-10">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-md shadow-purple-600/30">
                        {heroItem.type === 'series' ? 'Featured Series' : 'Featured Premiere'}
                      </span>
                      {heroItem.rating && (
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
                          <i className="fa-solid fa-star text-[10px]" /> {heroItem.rating}
                        </span>
                      )}
                      <span className="text-xs text-gray-300 font-medium">• {heroItem.year}</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                      {heroItem.title}
                    </h1>

                    <p className="text-xs md:text-sm text-gray-300 mt-3 line-clamp-3 leading-relaxed drop-shadow">
                      {heroItem.overview}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      <button 
                        onClick={() => openMediaDetails(heroItem)}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/40 transition-all hover:scale-105 active:scale-95"
                      >
                        <i className="fa-solid fa-circle-info" />
                        <span>Explore Details & Media</span>
                      </button>

                      <button
                        onClick={async () => {
                          await openMediaDetails(heroItem);
                          setDetailsTab('videos');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.18] text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all active:scale-95"
                      >
                        <i className="fa-solid fa-play text-purple-400" />
                        <span>Watch Official Trailer</span>
                      </button>

                      <button
                        onClick={() => toggleWatchlist(heroItem)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                          isBookmarked(heroItem.id)
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-gray-300'
                        }`}
                        title="Add to Watchlist"
                      >
                        <i className={`fa-${isBookmarked(heroItem.id) ? 'solid' : 'regular'} fa-bookmark text-xs`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* HORIZONTAL SHELF: TRENDING TITLES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-fire text-amber-500" />
                      <span>Trending Titles</span>
                    </h2>
                    <div className="flex items-center bg-white/[0.06] p-0.5 rounded-lg border border-white/10 text-[11px] font-semibold">
                      <button 
                        onClick={async () => {
                          setTrendingTimeframe('day');
                          const res = await fetch('/api/tmdb/trending/movie/day');
                          const d = await res.json();
                          if (d.status === 'success') setTrendingItems(d.data || []);
                        }}
                        className={`px-2.5 py-0.5 rounded-md transition-all ${trendingTimeframe === 'day' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Today
                      </button>
                      <button 
                        onClick={async () => {
                          setTrendingTimeframe('week');
                          const res = await fetch('/api/tmdb/trending/movie/week');
                          const d = await res.json();
                          if (d.status === 'success') setTrendingItems(d.data || []);
                        }}
                        className={`px-2.5 py-0.5 rounded-md transition-all ${trendingTimeframe === 'week' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        This Week
                      </button>
                    </div>
                  </div>
                </div>

                <MediaCarousel 
                  items={trendingItems} 
                  onOpen={openMediaDetails}
                  onBookmark={toggleWatchlist}
                  isBookmarked={isBookmarked}
                />
              </div>

              {/* HORIZONTAL SHELF: POPULAR MOVIES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-clapperboard text-purple-400" />
                    <span>Popular Blockbusters</span>
                  </h2>
                </div>
                <MediaCarousel 
                  items={popularItems} 
                  onOpen={openMediaDetails}
                  onBookmark={toggleWatchlist}
                  isBookmarked={isBookmarked}
                />
              </div>

              {/* HORIZONTAL SHELF: TELEVISION SHOWS */}
              {tvItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-tv text-indigo-400" />
                      <span>Popular Television Shows</span>
                    </h2>
                  </div>
                  <MediaCarousel 
                    items={tvItems} 
                    onOpen={openMediaDetails}
                    onBookmark={toggleWatchlist}
                    isBookmarked={isBookmarked}
                  />
                </div>
              )}

              {/* HORIZONTAL SHELF: NOW PLAYING IN THEATERS */}
              {nowPlayingItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-ticket text-rose-500" />
                      <span>Now Playing in Theaters</span>
                    </h2>
                  </div>
                  <MediaCarousel 
                    items={nowPlayingItems} 
                    onOpen={openMediaDetails}
                    onBookmark={toggleWatchlist}
                    isBookmarked={isBookmarked}
                  />
                </div>
              )}

              {/* HORIZONTAL SHELF: TOP RATED CLASSICS */}
              {topRatedItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-star text-amber-400" />
                      <span>Top Rated All-Time Masterpieces</span>
                    </h2>
                  </div>
                  <MediaCarousel 
                    items={topRatedItems} 
                    onOpen={openMediaDetails}
                    onBookmark={toggleWatchlist}
                    isBookmarked={isBookmarked}
                  />
                </div>
              )}

              {/* HORIZONTAL SHELF: UPCOMING RELEASES */}
              {upcomingItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-regular fa-calendar-days text-emerald-400" />
                      <span>Upcoming Releases</span>
                    </h2>
                  </div>
                  <MediaCarousel 
                    items={upcomingItems} 
                    onOpen={openMediaDetails}
                    onBookmark={toggleWatchlist}
                    isBookmarked={isBookmarked}
                  />
                </div>
              )}

              {/* GENRE DISCOVERY */}
              {genreList.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                  <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-shapes text-purple-400" />
                    <span>Explore by Genre</span>
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {genreList.map(g => (
                      <button
                        key={g.id}
                        onClick={async () => {
                          setIsSearching(true);
                          setActiveTab('search');
                          try {
                            const res = await fetch(`/api/tmdb/discover?genre=${g.id}`);
                            const d = await res.json();
                            setSearchResults(d.data || []);
                          } catch (_) {}
                          finally { setIsSearching(false); }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-purple-600/30 hover:border-purple-500/50 border border-white/[0.08] text-xs font-medium text-gray-300 hover:text-white transition-all active:scale-95"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </main>

        {/* ======================================================== */}
        {/* EXPANSIVE CINEMATIC DETAILS MODAL (ZERO SCROLL BLEED)     */}
        {/* ======================================================== */}
        {activeModalItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onClick={() => { setActiveModalItem(null); setActivePlayingVideo(null); }}
          >
            <div 
              className="relative w-full max-w-5xl h-[92vh] bg-[#0c0d14] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in duration-200"
              style={{ overscrollBehavior: 'contain' }}
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Sticky Top Header Bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#0c0d14]/90 backdrop-blur-xl shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-extrabold text-[10px] uppercase">
                    {activeModalItem.type === 'series' ? 'TV Series' : 'Movie'}
                  </span>
                  <h3 className="font-bold text-sm text-white truncate max-w-md">
                    {activeModalItem.title}
                  </h3>
                  {activeModalItem.year && (
                    <span className="text-xs text-gray-400">({activeModalItem.year})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWatchlist(activeModalItem)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                      isBookmarked(activeModalItem.id)
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-gray-300'
                    }`}
                  >
                    <i className={`fa-${isBookmarked(activeModalItem.id) ? 'solid' : 'regular'} fa-bookmark`} />
                    <span className="hidden sm:inline">{isBookmarked(activeModalItem.id) ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    onClick={() => { setActiveModalItem(null); setActivePlayingVideo(null); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-90"
                    title="Close"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content (Single Smooth Container with overscroll-contain) */}
              <div 
                ref={modalScrollRef}
                className="flex-1 overflow-y-auto overscroll-contain custom-scroll"
                style={{ overscrollBehavior: 'contain' }}
              >
                
                {/* Cinema Hero Poster & Backdrop Banner (ALWAYS VISIBLE & HIGH RESOLUTION) */}
                <div 
                  className="relative min-h-[280px] sm:min-h-[350px] bg-cover bg-center flex items-end p-6 sm:p-8 border-b border-white/10"
                  style={{
                    backgroundImage: `linear-gradient(to top, #0c0d14 0%, rgba(12,13,20,0.75) 50%, rgba(12,13,20,0.4) 100%), url(${activeModalItem.backdrop || activeModalItem.poster})`
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end relative z-10 w-full">
                    {/* Theatrical Poster */}
                    <div className="w-28 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 bg-gray-900 group relative">
                      <img 
                        src={activeModalItem.poster} 
                        alt={activeModalItem.title} 
                        className="w-full h-full object-cover" 
                      />
                      {activeModalItem.poster && (
                        <button
                          onClick={() => setActiveLightboxPhoto(activeModalItem.poster)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5"
                        >
                          <i className="fa-solid fa-expand" /> View 4K
                        </button>
                      )}
                    </div>

                    {/* Metadata & Direct Actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                        {activeModalItem.certification && (
                          <span className="px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-md font-bold text-gray-200 border border-white/10 text-[11px]">
                            {activeModalItem.certification}
                          </span>
                        )}
                        {activeModalItem.rating && (
                          <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/20 backdrop-blur-md text-xs">
                            <i className="fa-solid fa-star text-[11px]" /> {activeModalItem.rating}
                            {activeModalItem.voteCount ? (
                              <span className="text-gray-400 font-normal text-[10px]">({Number(activeModalItem.voteCount).toLocaleString()} votes)</span>
                            ) : null}
                          </span>
                        )}
                        {activeModalItem.duration && <span className="text-gray-300 font-medium">• {activeModalItem.duration}</span>}
                        {activeModalItem.releaseDate && <span className="text-gray-400 font-medium">• {activeModalItem.releaseDate}</span>}
                        {activeModalItem.statusName && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                            {activeModalItem.statusName}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                        {activeModalItem.title}
                      </h2>
                      {activeModalItem.originalTitle && activeModalItem.originalTitle !== activeModalItem.title && (
                        <p className="text-xs text-gray-400 italic mt-0.5">Original Title: {activeModalItem.originalTitle}</p>
                      )}
                      {activeModalItem.tagline && (
                        <p className="text-xs sm:text-sm italic text-purple-300 font-medium mt-1">"{activeModalItem.tagline}"</p>
                      )}

                      {/* Primary Quick-Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        {activeModalItem.trailer && activeModalItem.trailer.id ? (
                          <button
                            onClick={() => setActiveVideoModal({
                              id: activeModalItem.trailer.id,
                              title: `${activeModalItem.title} — ${activeModalItem.trailer.title || 'Official Trailer'}`,
                              type: activeModalItem.trailer.type || 'Trailer',
                              url: activeModalItem.trailer.url
                            })}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/40 active:scale-95 transition-all"
                          >
                            <i className="fa-solid fa-play text-xs" />
                            <span>Play Official Trailer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setDetailsTab('videos')}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 active:scale-95 transition-all"
                          >
                            <i className="fa-solid fa-film text-purple-400" />
                            <span>Browse Video Clips</span>
                          </button>
                        )}

                        {activeModalItem.clips && activeModalItem.clips.length > 0 && (
                          <button
                            onClick={() => setDetailsTab('videos')}
                            className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-gray-200 hover:text-white font-semibold text-xs flex items-center gap-2 border border-white/10 active:scale-95 transition-all"
                          >
                            <i className="fa-solid fa-video text-xs" />
                            <span>All Clips ({activeModalItem.clips.length})</span>
                          </button>
                        )}

                        {activeModalItem.photos && activeModalItem.photos.backdrops && activeModalItem.photos.backdrops.length > 0 && (
                          <button
                            onClick={() => setDetailsTab('photos')}
                            className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-gray-200 hover:text-white font-semibold text-xs flex items-center gap-2 border border-white/10 active:scale-95 transition-all"
                          >
                            <i className="fa-solid fa-images text-xs" />
                            <span>4K Photos ({activeModalItem.photos.backdrops.length})</span>
                          </button>
                        )}

                        {activeModalItem.trailer && activeModalItem.trailer.id && (
                          <a
                            href={activeModalItem.trailer.url || `https://www.youtube.com/watch?v=${activeModalItem.trailer.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                            title="Open on YouTube"
                          >
                            <i className="fa-brands fa-youtube text-red-400 text-sm" />
                            <span className="hidden md:inline">YouTube</span>
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-75" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs Bar */}
                <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto px-6 py-3 bg-[#0c0d14]/95 border-b border-white/[0.08] backdrop-blur-md custom-scroll">
                  <button
                    onClick={() => setDetailsTab('overview')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      detailsTab === 'overview'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    Overview & Stats
                  </button>
                  <button
                    onClick={() => setDetailsTab('videos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      detailsTab === 'videos'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>Trailers & Clips</span>
                    {activeModalItem.clips && activeModalItem.clips.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{activeModalItem.clips.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setDetailsTab('photos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      detailsTab === 'photos'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>Photos & Wallpapers</span>
                    {activeModalItem.photos && activeModalItem.photos.backdrops && (
                      <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{activeModalItem.photos.backdrops.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setDetailsTab('cast')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      detailsTab === 'cast'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    Cast & Crew
                  </button>
                  {activeModalItem.numberOfSeasons && (
                    <button
                      onClick={() => setDetailsTab('episodes')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        detailsTab === 'episodes'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      Episodes Guide
                    </button>
                  )}
                  <button
                    onClick={() => setDetailsTab('reviews')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      detailsTab === 'reviews'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    Community Reviews
                  </button>
                </div>

                {/* TAB CONTENT PANELS */}
                <div className="p-6 sm:p-8 space-y-8">
                  
                  {/* TAB: OVERVIEW */}
                  {detailsTab === 'overview' && (
                    <div className="space-y-6">
                      
                      {/* Financial Intelligence Bar */}
                      {(activeModalItem.budgetFormatted || activeModalItem.revenueFormatted) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500">Production Budget</span>
                            <div className="font-semibold text-white text-sm mt-0.5">{activeModalItem.budgetFormatted || 'Confidential'}</div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500">Worldwide Revenue</span>
                            <div className="font-semibold text-emerald-400 text-sm mt-0.5">{activeModalItem.revenueFormatted || 'Pending'}</div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500">Status</span>
                            <div className="font-semibold text-gray-300 text-sm mt-0.5">{activeModalItem.statusName || 'Released'}</div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500">Release Year</span>
                            <div className="font-semibold text-gray-300 text-sm mt-0.5">{activeModalItem.year}</div>
                          </div>
                        </div>
                      )}

                      {/* Synopsis Overview */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Synopsis</h4>
                        <p className="text-sm text-gray-300 leading-relaxed font-normal">
                          {activeModalItem.overview || 'No synopsis provided by TMDb intelligence.'}
                        </p>
                      </div>

                      {/* Genres & Keywords */}
                      <div className="flex flex-wrap gap-2">
                        {activeModalItem.genres && activeModalItem.genres.map(g => (
                          <span key={g} className="px-3 py-1 rounded-xl bg-purple-600/20 border border-purple-500/30 text-xs text-purple-300 font-medium">
                            {g}
                          </span>
                        ))}
                        {activeModalItem.keywords && activeModalItem.keywords.slice(0, 8).map(k => (
                          <span key={k} className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-gray-400">
                            #{k}
                          </span>
                        ))}
                      </div>

                      {/* Watch Providers (Where to Stream) */}
                      {activeModalItem.watchProviders && activeModalItem.watchProviders.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                            <i className="fa-solid fa-tower-broadcast text-purple-400" />
                            <span>Authorized Regional Streaming Providers</span>
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {activeModalItem.watchProviders.map(p => (
                              <div key={p.id || p.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10">
                                {p.logo && <img src={p.logo} alt={p.name} className="w-5 h-5 rounded-md" />}
                                <span className="text-xs font-medium text-white">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Cast Highlight */}
                      {activeModalItem.cast && activeModalItem.cast.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Top Billed Cast</h4>
                            <button onClick={() => setDetailsTab('cast')} className="text-xs text-purple-400 hover:underline">
                              View Full Cast ({activeModalItem.cast.length})
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {activeModalItem.cast.slice(0, 6).map(c => (
                              <div 
                                key={c.id || c.name} 
                                onClick={() => openPersonDetails(c.id)}
                                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/40 text-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2 bg-gray-800 shadow-md">
                                  <img src={c.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`} alt={c.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-xs font-bold text-white truncate">{c.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{c.character}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Production Companies */}
                      {activeModalItem.companies && activeModalItem.companies.length > 0 && (
                        <div className="pt-4 border-t border-white/[0.08]">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Production Studios</h4>
                          <div className="flex flex-wrap gap-4 items-center">
                            {activeModalItem.companies.map(c => (
                              <div key={c.id || c.name} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
                                {c.logo && (
                                  <div className="w-6 h-6 bg-white/90 rounded p-0.5 flex items-center justify-center">
                                    <img src={c.logo} alt={c.name} className="max-w-full max-h-full object-contain" />
                                  </div>
                                )}
                                <span className="text-xs text-gray-300 font-medium">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Similar / Recommended Carousel */}
                      {activeModalItem.recommendations && activeModalItem.recommendations.length > 0 && (
                        <div className="pt-4 border-t border-white/[0.08]">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Recommended Titles</h4>
                          <div className="flex gap-3 overflow-x-auto pb-3 custom-scroll">
                            {activeModalItem.recommendations.map(r => (
                              <div 
                                key={r.id}
                                onClick={() => openMediaDetails(r)}
                                className="w-36 shrink-0 rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] p-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-1.5">
                                  <img src={r.poster} alt={r.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-xs font-bold text-white truncate">{r.title}</div>
                                <div className="text-[10px] text-purple-400 font-medium">{r.matchRate}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* TAB: VIDEOS & TRAILERS */}
                  {detailsTab === 'videos' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <i className="fa-solid fa-film text-purple-400" />
                            <span>All Verified Trailers, Teasers & Featurettes</span>
                          </h4>
                          <span className="text-xs text-gray-400">Watch official trailers, promotional teasers, and behind-the-scenes clips</span>
                        </div>
                        {activeModalItem.clips && activeModalItem.clips.length > 0 && (
                          <span className="text-xs text-purple-400 font-semibold bg-purple-600/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                            {activeModalItem.clips.length} Clips Available
                          </span>
                        )}
                      </div>

                      {activeModalItem.clips && activeModalItem.clips.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {activeModalItem.clips.map(clip => (
                            <div 
                              key={clip.id}
                              className="group relative rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/50 transition-all hover:scale-[1.02] flex flex-col justify-between"
                            >
                              <div 
                                onClick={() => setActiveVideoModal({
                                  id: clip.id,
                                  title: `${activeModalItem.title} — ${clip.name}`,
                                  type: clip.type,
                                  url: clip.url
                                })}
                                className="aspect-video bg-black relative cursor-pointer overflow-hidden"
                              >
                                <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-play text-sm ml-0.5" />
                                  </div>
                                </div>
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-white uppercase border border-white/10">
                                  {clip.type}
                                </span>
                              </div>

                              <div className="p-3.5 flex flex-col justify-between flex-1">
                                <h5 className="font-bold text-xs text-white line-clamp-2 leading-snug">{clip.name}</h5>
                                
                                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06] text-[11px]">
                                  <button
                                    onClick={() => setActiveVideoModal({
                                      id: clip.id,
                                      title: `${activeModalItem.title} — ${clip.name}`,
                                      type: clip.type,
                                      url: clip.url
                                    })}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                                  >
                                    <i className="fa-solid fa-play text-[10px]" /> Play in Theater
                                  </button>

                                  <a
                                    href={clip.url || `https://www.youtube.com/watch?v=${clip.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
                                  >
                                    <i className="fa-brands fa-youtube text-red-500" />
                                    <span>YouTube</span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-70" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-16 text-center text-gray-400 text-xs bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                          <i className="fa-solid fa-video-slash text-2xl mb-2 text-gray-600 block" />
                          No promotional videos or trailers cataloged for this title on TMDb.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: PHOTOS & WALLPAPERS */}
                  {detailsTab === 'photos' && (
                    <div className="space-y-8">
                      {/* Backdrops Gallery */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <i className="fa-solid fa-panorama text-purple-400" />
                            <span>High-Resolution Backdrops & Cinematic Stills</span>
                          </h4>
                          {activeModalItem.photos && activeModalItem.photos.backdrops && (
                            <span className="text-xs text-gray-400">{activeModalItem.photos.backdrops.length} Stills</span>
                          )}
                        </div>

                        {activeModalItem.photos && activeModalItem.photos.backdrops && activeModalItem.photos.backdrops.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                            {activeModalItem.photos.backdrops.map((photoUrl, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setActiveLightboxPhoto(photoUrl)}
                                className="aspect-video rounded-2xl overflow-hidden bg-gray-900 border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative group shadow-lg"
                              >
                                <img src={photoUrl} alt={`Backdrop ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-semibold border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                                    <i className="fa-solid fa-expand" /> Fullscreen 4K
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-gray-400 text-xs bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                            No backdrop still photos cataloged for this title.
                          </div>
                        )}
                      </div>

                      {/* Posters Gallery */}
                      <div className="pt-6 border-t border-white/[0.08]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                            <i className="fa-solid fa-image text-purple-400" />
                            <span>Official Theatrical & Regional Posters</span>
                          </h4>
                          {activeModalItem.photos && activeModalItem.photos.posters && (
                            <span className="text-xs text-gray-400">{activeModalItem.photos.posters.length} Posters</span>
                          )}
                        </div>

                        {activeModalItem.photos && activeModalItem.photos.posters && activeModalItem.photos.posters.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
                            {activeModalItem.photos.posters.map((posterUrl, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setActiveLightboxPhoto(posterUrl)}
                                className="aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900 border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.03] active:scale-95 relative group shadow-lg"
                              >
                                <img src={posterUrl} alt={`Poster ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="w-9 h-9 rounded-full bg-black/80 text-white flex items-center justify-center border border-white/20">
                                    <i className="fa-solid fa-expand text-xs" />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-gray-400 text-xs bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                            No alternative posters cataloged for this title.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: CAST & CREW */}
                  {detailsTab === 'cast' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Starring Cast</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {activeModalItem.cast && activeModalItem.cast.map(c => (
                            <div 
                              key={c.id || c.name} 
                              onClick={() => openPersonDetails(c.id)}
                              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/40 text-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 bg-gray-800 shadow-md">
                                <img src={c.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}`} alt={c.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-xs font-bold text-white truncate">{c.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{c.character}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Crew Breakdown */}
                      {activeModalItem.crew && activeModalItem.crew.length > 0 && (
                        <div className="pt-4 border-t border-white/[0.08]">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Key Crew Members</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {activeModalItem.crew.map((member, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0">
                                  <img src={member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} alt={member.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">{member.name}</div>
                                  <div className="text-[10px] text-purple-400 truncate">{member.job}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: EPISODES GUIDE (TV SHOWS) */}
                  {detailsTab === 'episodes' && activeModalItem.numberOfSeasons && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Episodes Directory</h4>
                        <span className="text-xs text-gray-400">{activeModalItem.numberOfSeasons} Seasons Available</span>
                      </div>

                      {/* Season Selector Tabs */}
                      <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                        {Array.from({ length: activeModalItem.numberOfSeasons }, (_, i) => i + 1).map(sNum => (
                          <button
                            key={sNum}
                            onClick={() => loadSeasonEpisodes(activeModalItem.tmdbId || activeModalItem.id, sNum)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                              selectedSeason === sNum
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                          >
                            Season {sNum}
                          </button>
                        ))}
                      </div>

                      {/* Episode Cards */}
                      <div className="space-y-3">
                        {isLoadingSeason ? (
                          <div className="py-12 text-center text-gray-400 text-xs">
                            <i className="fa-solid fa-spinner fa-spin mr-2" /> Fetching episode stills & overviews...
                          </div>
                        ) : (
                          seasonEpisodes.map(ep => (
                            <div key={ep.episode} className="flex flex-col sm:flex-row gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] items-center">
                              <div className="w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-gray-800 shrink-0 relative">
                                <img src={ep.thumbnail || activeModalItem.backdrop} alt={ep.title} className="w-full h-full object-cover" />
                                {ep.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white">
                                    {ep.duration}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-bold text-white">Episode {ep.episode}: {ep.title}</span>
                                  <span className="text-[10px] text-gray-400">{ep.airDate}</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{ep.overview}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: REVIEWS */}
                  {detailsTab === 'reviews' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Verified User & Critic Reviews</h4>
                      </div>

                      {activeModalItem.reviews && activeModalItem.reviews.length > 0 ? (
                        <div className="space-y-4">
                          {activeModalItem.reviews.map(r => (
                            <div key={r.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs">
                                    {r.author.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs text-white">{r.author}</span>
                                    <span className="text-[10px] text-gray-500 ml-2">{r.createdAt}</span>
                                  </div>
                                </div>
                                {r.rating && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1">
                                    <i className="fa-solid fa-star text-[10px]" /> {r.rating}/10
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed font-normal whitespace-pre-line line-clamp-6">
                                {r.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-16 text-center text-gray-400 text-xs">
                          No reviews currently submitted for this title on TMDb.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CINEMA THEATER VIDEO PLAYER MODAL                         */}
        {/* ======================================================== */}
        {activeVideoModal && (
          <div 
            onClick={() => setActiveVideoModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div 
              className="relative w-full max-w-4xl bg-[#090b12] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Theater Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0c0d14]/90 backdrop-blur-md">
                <div className="flex items-center gap-2.5 truncate max-w-lg">
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                    {activeVideoModal.type || 'Trailer'}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeVideoModal.title || 'Official Video'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={activeVideoModal.url || `https://www.youtube.com/watch?v=${activeVideoModal.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all active:scale-95"
                    title="Open on YouTube"
                  >
                    <i className="fa-brands fa-youtube text-red-500 text-sm" />
                    <span className="hidden sm:inline">Watch on YouTube</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-70" />
                  </a>
                  <button
                    onClick={() => setActiveVideoModal(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-90"
                    title="Close Player"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              </div>

              {/* Theater 16:9 Iframe Player */}
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.id}?autoplay=1&rel=0&enablejsapi=1`}
                  title={activeVideoModal.title || 'Movie Video Player'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Theater Footer Bar */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#090b12] text-xs text-gray-400 border-t border-white/5">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-info text-purple-400" />
                  High Definition Streaming via TMDb Verified Source
                </span>
                <span className="text-[11px] text-gray-500">Press ESC or click outside to exit theater</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* FULLSCREEN PHOTO LIGHTBOX VIEWER                         */}
        {/* ======================================================== */}
        {activeLightboxPhoto && (
          <div 
            onClick={() => setActiveLightboxPhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl cursor-zoom-out animate-in fade-in duration-200"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
              <a
                href={activeLightboxPhoto}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                <span>Open Full-Res</span>
              </a>
              <button
                onClick={() => setActiveLightboxPhoto(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-90"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>
            <img 
              src={activeLightboxPhoto} 
              alt="Lightbox View" 
              className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* ACTOR / PERSON PROFILE MODAL                             */}
        {/* ======================================================== */}
        {activePerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div 
              className="relative w-full max-w-3xl bg-[#0c0d14] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[88vh] overflow-y-auto overscroll-contain custom-scroll"
              style={{ overscrollBehavior: 'contain' }}
            >
              <button
                onClick={() => setActivePerson(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-90"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/10 bg-gray-800">
                  <img src={activePerson.photo} alt={activePerson.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-600/30 text-purple-300 text-[10px] font-bold uppercase">
                    {activePerson.knownForDepartment || 'Acting'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5">{activePerson.name}</h2>
                  {activePerson.placeOfBirth && (
                    <p className="text-xs text-gray-400 mt-0.5">Born in {activePerson.placeOfBirth}</p>
                  )}
                  {activePerson.biography && (
                    <p className="text-xs text-gray-300 leading-relaxed mt-3 line-clamp-6">
                      {activePerson.biography}
                    </p>
                  )}
                </div>
              </div>

              {/* Filmography Grid */}
              {activePerson.filmography && activePerson.filmography.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/[0.08]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Key Filmography</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {activePerson.filmography.slice(0, 18).map(f => (
                      <div
                        key={f.id}
                        onClick={() => { openMediaDetails(f); setActivePerson(null); }}
                        className="rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/40 p-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-1.5">
                          <img src={f.poster} alt={f.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[11px] font-bold text-white truncate">{f.title}</div>
                        <div className="text-[10px] text-gray-400 truncate">{f.character}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INTERACTIVE VOICE & TEXT DIALOGUE HUD (AKBAR GATE)      */}
        {/* ======================================================== */}
        {dialogueSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#090b12] border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
              
              <button
                onClick={() => { setDialogueSession(null); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>

              {/* Pulsing Acoustic Waves Indicator */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full bg-purple-600/30 ${isListening ? 'animate-ping' : ''}`} />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-purple-600/50 relative z-10">
                  <i className="fa-solid fa-microphone" />
                </div>
              </div>

              {/* Spoken Prompt Display */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-600/20 px-3 py-1 rounded-full border border-purple-500/30">
                  Interactive Gate Protocol
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-3">
                  "{dialogueSession.prompt}"
                </h3>
              </div>

              {/* Conversation History Stream */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-2 text-left text-xs custom-scroll">
                {dialogueSession.messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded-xl max-w-[85%] ${
                      m.sender === 'user' 
                        ? 'ml-auto bg-purple-600 text-white' 
                        : 'mr-auto bg-white/10 text-gray-200'
                    }`}
                  >
                    <span className="text-[9px] uppercase opacity-75 block font-bold">
                      {m.sender === 'user' ? 'You' : 'Assistant'}
                    </span>
                    {m.text}
                  </div>
                ))}
              </div>

              {/* Voice / Text Response Input */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dialogueInputText.trim()) {
                    handleDialogueInteraction(dialogueInputText.trim(), dialogueSession.sessionId);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={dialogueInputText}
                  onChange={(e) => setDialogueInputText(e.target.value)}
                  placeholder="Speak or type your answer..."
                  className="flex-1 bg-white/[0.07] border border-white/15 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
                
                <button
                  type="button"
                  onClick={() => startDialogueVoiceCapture(dialogueSession.sessionId)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                    isListening 
                      ? 'bg-purple-600 text-white border-purple-500 animate-pulse' 
                      : 'bg-white/10 border-white/15 text-purple-400 hover:text-white'
                  }`}
                  title="Speak via mic"
                >
                  <i className="fa-solid fa-microphone text-xs" />
                </button>

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
                >
                  Submit
                </button>
              </form>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PRIVATE APP PASSWORD GATE (OPENS AFTER SIM SIM KHUL JA)   */}
        {/* ======================================================== */}
        {showPasswordGate && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onClick={() => setShowPasswordGate(false)}
          >
            <div 
              className="relative w-full max-w-md bg-[#090b12] border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPasswordGate(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>

              {/* Glowing Security Shield Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/20 border border-purple-500/40 mx-auto flex items-center justify-center text-purple-400 text-2xl shadow-xl shadow-purple-600/30">
                <i className="fa-solid fa-shield-halved" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-600/20 px-3 py-1 rounded-full border border-purple-500/30">
                  Private Application Gate
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Enter Gate Passcode
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Akbar gate verified. Please enter your private application password to open CinemaVerse.
                </p>
              </div>

              {/* Error Alert */}
              {gateError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium flex items-center gap-2 text-left">
                  <i className="fa-solid fa-triangle-exclamation text-red-400 shrink-0" />
                  <span>{gateError}</span>
                </div>
              )}

              {/* Password Entry Form */}
              <form onSubmit={handleVerifyGatePassword} className="space-y-4">
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    ref={gateInputRef}
                    type={showGatePasswordText ? "text" : "password"}
                    autoFocus
                    value={gatePasswordInput}
                    onChange={(e) => setGatePasswordInput(e.target.value)}
                    placeholder="Enter private password..."
                    disabled={isVerifyingGate}
                    className="w-full bg-white/[0.06] border border-white/15 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 rounded-xl pl-9 pr-10 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGatePasswordText(!showGatePasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs p-1"
                    title={showGatePasswordText ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showGatePasswordText ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingGate}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-600/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifyingGate ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                      <span>Verifying Passcode...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-key text-xs" />
                      <span>Unlock CinemaVerse</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[10px] text-gray-500">
                <i className="fa-solid fa-fingerprint text-purple-400" />
                <span>PBKDF2 Salted Encryption • Anti-Brute Force Protection</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ========================================================
// MEDIA CAROUSEL COMPONENT
// ========================================================
function MediaCarousel({ items, onOpen, onBookmark, isBookmarked }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left Scroll Button */}
      <button
        onClick={() => scroll('left')}
        className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 hover:bg-black/95 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-md hover:scale-110 active:scale-90"
        title="Scroll left"
      >
        <i className="fa-solid fa-chevron-left text-sm" />
      </button>

      {/* Horizontally Scrollable Row */}
      <div 
        ref={rowRef}
        className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scroll scroll-smooth"
      >
        {items.map(item => (
          <div key={item.id} className="w-36 sm:w-44 shrink-0">
            <MediaCard 
              item={item} 
              onOpen={() => onOpen(item)} 
              onBookmark={() => onBookmark(item)}
              isBookmarked={isBookmarked(item.id)}
            />
          </div>
        ))}
      </div>

      {/* Right Scroll Button */}
      <button
        onClick={() => scroll('right')}
        className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 hover:bg-black/95 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl backdrop-blur-md hover:scale-110 active:scale-90"
        title="Scroll right"
      >
        <i className="fa-solid fa-chevron-right text-sm" />
      </button>
    </div>
  );
}

// ========================================================
// INDIVIDUAL MEDIA CARD COMPONENT
// ========================================================
function MediaCard({ item, onOpen, onBookmark, isBookmarked }) {
  return (
    <div className="group rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col h-full">
      
      {/* Poster with 2/3 Aspect Ratio */}
      <div 
        onClick={onOpen}
        className="aspect-[2/3] bg-gray-900 relative overflow-hidden cursor-pointer"
      >
        <img 
          src={item.poster || item.photo} 
          alt={item.title || item.name} 
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://via.placeholder.com/500x750/0b0f19/a855f7?text=CinePulse';
          }}
        />

        {/* Rating Badge */}
        {item.rating && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 font-bold text-[10px] flex items-center gap-1 border border-white/10">
            <i className="fa-solid fa-star text-[9px]" /> {item.rating}
          </span>
        )}

        {/* Bookmark Action */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10 ${
            isBookmarked
              ? 'bg-purple-600 text-white'
              : 'bg-black/60 text-gray-300 hover:text-white hover:bg-black/90'
          }`}
          title={isBookmarked ? 'Remove Bookmark' : 'Add to Watchlist'}
        >
          <i className={`fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark text-[10px]`} />
        </button>

        {/* Quick View Action on Hover */}
        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
          <span className="px-3 py-1.5 rounded-xl bg-purple-600/90 text-white font-semibold text-xs shadow-xl backdrop-blur-md flex items-center gap-1.5 transform scale-90 group-hover:scale-100 transition-transform">
            <i className="fa-solid fa-circle-info text-[11px]" /> Explore
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3 flex-1 flex flex-col justify-between" onClick={onOpen}>
        <div>
          <h3 className="font-bold text-xs text-white truncate cursor-pointer group-hover:text-purple-400 transition-colors">
            {item.title || item.name}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
            <span>{item.year || (item.type === 'person' ? 'Actor' : 'Release')}</span>
            {item.matchRate && (
              <span className="text-purple-400 font-medium text-[10px]">{item.matchRate}</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ========================================================
// SERVER SIDE PROPS FOR INSTANT SSR PERFORMANCE
// ========================================================
export async function getServerSideProps() {
  try {
    const tmdb = require('../lib/tmdb');
    const [trendingRes, popularRes, topRatedRes, nowPlayingRes, upcomingRes] = await Promise.all([
      tmdb.getTrending('movie', 'day'),
      tmdb.getPopular('movie', 1),
      tmdb.getTopRated('movie', 1),
      tmdb.getNowPlaying(1),
      tmdb.getUpcoming(1)
    ]);

    return {
      props: {
        initialTrending: trendingRes.data || [],
        initialPopular: popularRes.data || [],
        initialTopRated: topRatedRes.data || [],
        initialNowPlaying: nowPlayingRes.data || [],
        initialUpcoming: upcomingRes.data || []
      }
    };
  } catch (err) {
    console.error('Failed to pre-fetch TMDB data for SSR:', err.message);
    return {
      props: {
        initialTrending: [],
        initialPopular: [],
        initialTopRated: [],
        initialNowPlaying: [],
        initialUpcoming: []
      }
    };
  }
}
