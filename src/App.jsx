import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Heart, Star, Film, ChevronLeft, ChevronRight, X, Info, Clapperboard, MonitorPlay } from 'lucide-react';

// --- CONFIGURATION ---
/**
 * IMPORTANT: Replace this placeholder string with your actual, short OMDB API key
 * (e.g., 'a1b2c3d4'). DO NOT include the full URL here.
 */
const OMDB_API_KEY = "8495791e"; 

// This constructs the full base URL correctly by appending the short key.
const API_BASE_URL = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}`;
const MOVIES_PER_PAGE = 10; // OMDB API standard page size

// --- UTILITY HOOKS ---

/**
 * Debounce hook to delay value updates, preventing excessive API calls.
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};


// --- CONTEXT for Global State (Favorites) ---

const FavoritesContext = createContext();

const FavoritesProvider = ({ children }) => {
    // NOTE: In a production environment with persistence, this state should be managed 
    // via Firebase Firestore using onSnapshot listeners.
    const [favorites, setFavorites] = useState({});

    const isFavorite = (imdbID) => !!favorites[imdbID];

    const toggleFavorite = (movie) => {
        setFavorites(prev => {
            const newFavorites = { ...prev };
            if (newFavorites[movie.imdbID]) {
                delete newFavorites[movie.imdbID];
            } else {
                // Store minimal movie data required for displaying in a favorites list
                newFavorites[movie.imdbID] = {
                    Title: movie.Title,
                    Year: movie.Year,
                    Poster: movie.Poster,
                    imdbID: movie.imdbID,
                    Type: movie.Type
                };
            }
            return newFavorites;
        });
    };

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

const useFavorites = () => useContext(FavoritesContext);

// --- API HOOK ---

const useMovieData = () => {
    const [results, setResults] = useState([]);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchMovies = useCallback(async ({ s, type = 'any', page = 1 }) => {
        if (!s) {
            setResults([]);
            setTotalResults(0);
            return;
        }

        if (OMDB_API_KEY === "YOUR_OMDB_API_KEY" || OMDB_API_KEY.includes('http')) {
            setError("Configuration Error: Please replace 'YOUR_OMDB_API_KEY' in the code with your actual, short key string (e.g., 'a1b2c3d4'). A full URL is not a valid key.");
            setLoading(false);
            setResults([]);
            setTotalResults(0);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        let url = `${API_BASE_URL}&s=${s}&page=${page}`;
        if (type !== 'any') {
            url += `&type=${type}`;
        }

        try {
            const response = await fetch(url);
            const text = await response.text();
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonErr) {
                console.error("Failed to parse response as JSON. Response Text starts with:", text.substring(0, 100) + '...');
                throw new Error("Invalid API Key or Service Error. The server returned an invalid response (likely an HTML error page) instead of movie data.");
            }

            if (data.Response === "True") {
                setResults(data.Search || []);
                setTotalResults(parseInt(data.totalResults, 10));
                // Update URL params
                navigate(`/?s=${encodeURIComponent(s)}&type=${type}&page=${page}`, { replace: true });
            } else {
                setResults([]);
                setTotalResults(0);
                setError(data.Error || "No movies found matching your criteria.");
                navigate(`/?s=${encodeURIComponent(s)}&type=${type}&page=${page}`, { replace: true });
            }
        } catch (err) {
            console.error("API Fetch Error:", err);
            setError(err.message || "Failed to connect to the movie database. Please check your connection or API key.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    return { results, totalResults, loading, error, fetchMovies };
};

// --- UTILITY COMPONENTS ---

const Navbar = () => {
    const { favorites } = useFavorites();
    const favoritesCount = Object.keys(favorites).length;

    return (
        <header className="sticky top-0 z-50 bg-black/95 shadow-2xl shadow-black/50 border-b border-gray-800">
            <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link to="/" className="text-3xl font-extrabold text-red-600 hover:text-red-500 transition tracking-tight flex items-center logo-font">
                    <MonitorPlay className="w-8 h-8 mr-2 fill-red-600 stroke-red-600" />
                    CineStream
                </Link>
                <div className="flex items-center space-x-6">
                    <Link 
                        to="/favorites" 
                        className="flex items-center text-gray-200 hover:text-red-500 transition relative p-2 rounded-xl hover:bg-gray-800"
                        title="View Favorites"
                    >
                        <Heart className="w-6 h-6 fill-none stroke-current" />
                        <span className="ml-2 hidden sm:inline font-semibold">My List</span>
                        {favoritesCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-black shadow-md">
                                {favoritesCount > 99 ? '99+' : favoritesCount}
                            </span>
                        )}
                    </Link>
                </div>
            </nav>
        </header>
    );
};

const MovieCard = ({ movie }) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const navigate = useNavigate();
    const isFav = isFavorite(movie.imdbID);

    const placeholder = `https://placehold.co/300x450/4B5563/FFFFFF?text=${encodeURIComponent('No Poster Available')}`;
    const posterSrc = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : placeholder;
    
    // Determine the icon and color based on movie type
    let typeIcon = Film;
    let typeColor = 'text-red-500';
    if (movie.Type === 'series') {
        typeIcon = MonitorPlay;
        typeColor = 'text-cyan-400';
    } else if (movie.Type === 'episode') {
        typeIcon = Clapperboard;
        typeColor = 'text-yellow-400';
    }
    const TypeIcon = typeIcon;


    return (
        <div 
            className="group relative bg-gray-900 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105 overflow-hidden flex flex-col cursor-pointer border border-gray-800"
        >
            {/* Poster Section (Clickable to detail page) */}
            <div 
                className="h-80 overflow-hidden relative"
                onClick={() => navigate(`/movie/${movie.imdbID}`)}
            >
                <img 
                    src={posterSrc} 
                    alt={movie.Title} 
                    className="w-full h-full object-cover transition duration-500 group-hover:opacity-75" 
                    onError={(e) => { e.target.onerror = null; e.target.src = placeholder; }}
                />
                {/* Subtle overlay on hover */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300"></div>
            </div>

            {/* Favorite Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); 
                    toggleFavorite(movie);
                }}
                className={`absolute top-3 right-3 p-2 rounded-full transition duration-300 transform hover:scale-110 ${
                    isFav 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-black/70 text-gray-300 hover:text-red-500 hover:bg-black/90 shadow-md backdrop-blur-sm'
                }`}
                title={isFav ? "Remove from My List" : "Add to My List"}
            >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-white' : 'fill-none stroke-current'}`} />
            </button>

            {/* Content Section (Clickable to detail page) */}
            <div className="p-4 flex flex-col flex-grow bg-gray-900" onClick={() => navigate(`/movie/${movie.imdbID}`)}>
                <h3 className="text-lg font-bold text-white line-clamp-2 mb-1 flex-grow hover:text-red-500 transition leading-snug">
                    {movie.Title}
                </h3>
                <p className="text-sm text-gray-400 mt-2 flex items-center">
                    <TypeIcon className={`w-4 h-4 inline mr-1 ${typeColor}`} />
                    <span className="capitalize">{movie.Type}</span> ({movie.Year})
                </p>
            </div>
        </div>
    );
};

const Pagination = ({ totalResults, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(totalResults / MOVIES_PER_PAGE);

    if (totalResults <= MOVIES_PER_PAGE || totalPages === 1) return null;

    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const half = Math.floor(maxPagesToShow / 2);
        if (currentPage <= half) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + half >= totalPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - half;
            endPage = currentPage + half;
        }
    }

    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    const PageButton = ({ page, isActive, children, onClick, isDisabled = false }) => (
        <button
            onClick={onClick}
            disabled={isDisabled || isActive}
            className={`flex items-center justify-center min-w-[40px] h-10 px-3 mx-1 rounded-full font-semibold transition duration-200 shadow-xl ${
                isActive
                ? 'bg-red-600 text-white hover:bg-red-500'
                : isDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:border-red-600'
            }`}
        >
            {children || page}
        </button>
    );

    return (
        <div className="flex justify-center items-center my-12 flex-wrap space-x-1">
            <PageButton
                onClick={() => onPageChange(currentPage - 1)}
                isDisabled={currentPage === 1}
            >
                <ChevronLeft className="w-5 h-5" />
            </PageButton>

            {pages.map(page => (
                <PageButton 
                    key={page} 
                    page={page} 
                    isActive={page === currentPage} 
                    onClick={() => onPageChange(page)}
                />
            ))}

            <PageButton
                onClick={() => onPageChange(currentPage + 1)}
                isDisabled={currentPage === totalPages}
            >
                <ChevronRight className="w-5 h-5" />
            </PageButton>
        </div>
    );
};

// New component for Search Form with Suggestions logic
const SuggestionsSearchForm = ({ initialSearch, initialType, onSearch }) => {
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [type, setType] = useState(initialType);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce for 300ms
    const navigate = useNavigate();
    const wrapperRef = useRef(null);

    // Sync internal state with URL params when they change (e.g., when navigating back/forward)
    useEffect(() => {
        setSearchTerm(initialSearch);
        setType(initialType);
        // Clear suggestions when the main search changes
        setSuggestions([]); 
    }, [initialSearch, initialType]);

    // Handle clicks outside the suggestion box
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsInputFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);


    // Effect for fetching suggestions based on debounced input
    useEffect(() => {
        const fetchSuggestions = async (s) => {
            if (!s || s.length < 3) {
                setSuggestions([]);
                return;
            }
            
            setSuggestionsLoading(true);
            try {
                // OMDB API doesn't have a dedicated autocomplete endpoint. We use the search endpoint
                // and limit to the first 5 results to simulate autocomplete/suggestions.
                let url = `${API_BASE_URL}&s=${s}&page=1`;
                if (type !== 'any') {
                    url += `&type=${type}`;
                }
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.Response === "True") {
                    // Take only the first 5 results for a clean suggestion dropdown
                    setSuggestions(data.Search.slice(0, 5));
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Suggestion fetch error:", error);
                setSuggestions([]);
            } finally {
                setSuggestionsLoading(false);
            }
        };

        if (isInputFocused) {
            fetchSuggestions(debouncedSearchTerm.trim());
        } else {
            setSuggestions([]);
        }
        
    }, [debouncedSearchTerm, type, isInputFocused]);


    const handleSubmit = (e) => {
        e.preventDefault();
        setIsInputFocused(false); // Hide suggestions on submit
        if (searchTerm.trim()) {
            onSearch({ s: searchTerm.trim(), type, page: 1 });
        } else {
            navigate(`/?s=&type=${type}&page=1`, { replace: true });
        }
    };

    const handleSuggestionClick = (title) => {
        setSearchTerm(title);
        setIsInputFocused(false);
        // Immediately trigger the main search with the suggested title
        onSearch({ s: title, type, page: 1 });
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setType(newType);
        if (searchTerm.trim()) {
            onSearch({ s: searchTerm.trim(), type: newType, page: 1 });
        } else {
            navigate(`/?s=&type=${newType}&page=1`, { replace: true });
        }
    };

    const movieTypes = [
        { value: 'any', label: 'All Types' },
        { value: 'movie', label: 'Movie' },
        { value: 'series', label: 'Series' },
        { value: 'episode', label: 'Episode' },
    ];

    const showSuggestions = isInputFocused && searchTerm.length >= 3 && (suggestions.length > 0 || suggestionsLoading);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto mb-16 p-4 md:p-0">
            {/* Search Input and Suggestions Container */}
            <div className="relative flex-grow" ref={wrapperRef}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search for a movie, series, or episode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        className="w-full py-4 pl-12 pr-4 bg-gray-800 text-white border border-gray-700 rounded-xl focus:ring-4 focus:ring-red-600 focus:border-red-600 transition duration-150 shadow-lg text-lg font-medium placeholder-gray-500"
                    />
                    {searchTerm && (
                        <button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-40 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl mt-2 overflow-hidden max-h-80 overflow-y-auto">
                        {suggestionsLoading ? (
                            <div className="flex items-center justify-center p-4 text-red-600">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm">Searching for suggestions...</span>
                            </div>
                        ) : (
                            suggestions.map((movie) => (
                                <div
                                    key={movie.imdbID}
                                    onClick={() => handleSuggestionClick(movie.Title)}
                                    className="flex items-center p-3 cursor-pointer hover:bg-gray-700 transition border-b border-gray-700 last:border-b-0"
                                >
                                    <img 
                                        src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : `https://placehold.co/50x75/4B5563/FFFFFF?text=...`} 
                                        alt={movie.Title} 
                                        className="w-10 h-14 object-cover rounded-md flex-shrink-0 mr-3"
                                        onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/50x75/4B5563/FFFFFF?text=...`; }}
                                    />
                                    <div className="truncate">
                                        <p className="font-semibold text-white truncate">{movie.Title}</p>
                                        <p className="text-sm text-gray-400">{movie.Year} ({movie.Type})</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Type Filter Dropdown */}
            <select
                value={type}
                onChange={handleTypeChange}
                className="py-4 px-6 bg-gray-800 text-white border border-gray-700 rounded-xl focus:ring-4 focus:ring-red-600 focus:border-red-600 transition duration-150 shadow-lg md:w-48 appearance-none font-semibold text-gray-200"
            >
                {movieTypes.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-gray-900">{label}</option>
                ))}
            </select>
            
            {/* Search Button */}
            <button
                type="submit"
                className="py-4 px-8 bg-red-600 text-white font-extrabold rounded-xl hover:bg-red-700 transition duration-200 shadow-xl shadow-red-900/50 md:w-auto transform hover:scale-[1.01] active:scale-[0.99]"
            >
                Search
            </button>
        </form>
    );
};


// --- PAGES ---

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    // Default URL parameter parsing
    const initialSearch = searchParams.get('s') || '';
    const initialType = searchParams.get('type') || 'any';
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    
    const { results, totalResults, loading, error, fetchMovies } = useMovieData();

    // Effect to perform initial search based on URL params on first load
    useEffect(() => {
        if (initialSearch) {
            fetchMovies({ s: initialSearch, type: initialType, page: initialPage });
        }
    }, [initialSearch, initialType, initialPage, fetchMovies]);

    const handleSearch = ({ s, type, page }) => {
        fetchMovies({ s, type, page });
    };

    const handlePageChange = (newPage) => {
        fetchMovies({ s: initialSearch, type: initialType, page: newPage });
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-24">
                    <Loader2 className="w-12 h-12 text-red-600 animate-spin mr-3" />
                    <p className="text-xl text-gray-300 font-medium">Searching the archives...</p>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className="text-center py-10 px-4 bg-red-900/50 border border-red-700 text-red-300 rounded-xl max-w-xl mx-auto shadow-md">
                    <p className="font-bold text-lg mb-2">Search Error</p>
                    <p>{error}</p>
                     {(OMDB_API_KEY === "YOUR_OMDB_API_KEY" || OMDB_API_KEY.includes('http')) && (
                        <p className="mt-4 text-sm font-semibold text-red-200 flex items-center justify-center">
                            <Info className="w-4 h-4 mr-1"/>
                            Please ensure you have replaced the placeholder with your **short, unique OMDB API key string**.
                        </p>
                    )}
                </div>
            );
        }

        if (initialSearch && results.length === 0) {
            return (
                <div className="text-center py-10 px-4 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl max-w-xl mx-auto shadow-md">
                    <p className="font-bold text-lg mb-2">No Results Found</p>
                    <p>No titles were found for "<span className="font-semibold text-white">{initialSearch}</span>". Try a broader term or different filter.</p>
                </div>
            );
        }

        if (!initialSearch && results.length === 0) {
             return (
                <div className="text-center py-20 px-4 bg-gray-900 text-white rounded-3xl max-w-3xl mx-auto shadow-xl border border-gray-700">
                    <p className="font-extrabold text-3xl mb-3 flex items-center justify-center logo-font">
                        <MonitorPlay className="w-8 h-8 mr-3 text-red-500 fill-red-200"/> WELCOME TO CINESTREAM!
                    </p>
                    <p className="text-lg text-gray-400">Enter a title above to begin your cinematic journey. The search bar now suggests popular matches as you type!</p>
                </div>
            );
        }

        return (
            <>
                <div className="text-center mb-10">
                    <h2 className="text-xl text-gray-400 font-medium logo-font tracking-wider">
                        FOUND <span className="font-extrabold text-red-500">{totalResults.toLocaleString()}</span> RESULTS FOR: <span className="font-semibold text-white">"{initialSearch.toUpperCase()}"</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">PAGE {initialPage} OF {Math.ceil(totalResults / MOVIES_PER_PAGE)}</p>
                </div>
                {/* Responsive grid for search results */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {results.map(movie => (
                        <MovieCard key={movie.imdbID} movie={movie} />
                    ))}
                </div>
                <Pagination 
                    totalResults={totalResults} 
                    currentPage={initialPage} 
                    onPageChange={handlePageChange} 
                />
            </>
        );
    };

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="sr-only">OMDB Movie Search Application</h1>
            <SuggestionsSearchForm 
                initialSearch={initialSearch} 
                initialType={initialType} 
                onSearch={handleSearch} 
            />
            {renderContent()}
        </main>
    );
};

const MovieDetail = () => {
    const { imdbID } = useParams();
    const { isFavorite, toggleFavorite } = useFavorites();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Fetch detailed movie information
    useEffect(() => {
        if (!imdbID) return;

        const fetchDetails = async () => {
            if (OMDB_API_KEY === "YOUR_OMDB_API_KEY" || OMDB_API_KEY.includes('http')) {
                setError("Configuration Error: Please replace 'YOUR_OMDB_API_KEY' in the code with your actual, short key string (e.g., 'a1b2c3d4'). A full URL is not a valid key.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                // Fetch full plot summary
                const response = await fetch(`${API_BASE_URL}&i=${imdbID}&plot=full`);
                
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (jsonErr) {
                    console.error("Failed to parse response as JSON for details. Response Text starts with:", text.substring(0, 100) + '...');
                    throw new Error("Invalid API Key or Service Error. The server returned an invalid response (likely an HTML error page) instead of movie data.");
                }

                if (data.Response === "True") {
                    setMovie(data);
                } else {
                    setError(data.Error || "Movie details could not be loaded.");
                }
            } catch (err) {
                setError(err.message || "Failed to fetch movie details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [imdbID]);

    // Handle Loading and Error states
    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 px-4 bg-red-900/50 border border-red-700 text-red-300 rounded-xl max-w-2xl mx-auto mt-10 shadow-lg">
                <p className="font-bold text-xl">Error Loading Details</p>
                <p>{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-md"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" /> Go Back
                </button>
            </div>
        );
    }

    if (!movie) return null;

    const isFav = isFavorite(movie.imdbID);
    const placeholder = `https://placehold.co/400x600/374151/FFFFFF?text=${encodeURIComponent(movie.Title)}`;
    const posterSrc = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : placeholder;
    const ratings = movie.Ratings || [];

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-10">
            <div className="bg-gray-900 rounded-3xl shadow-2xl p-6 lg:p-12 border border-gray-800">
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="mb-8 flex items-center text-red-500 hover:text-red-400 font-medium transition p-2 rounded-lg hover:bg-gray-800"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back to Search Results
                </button>

                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Poster Section */}
                    <div className="lg:w-1/3 flex-shrink-0">
                        <img 
                            src={posterSrc} 
                            alt={movie.Title} 
                            className="w-full max-h-[600px] object-cover rounded-xl shadow-2xl border-4 border-gray-800"
                            onError={(e) => { e.target.onerror = null; e.target.src = placeholder; }}
                        />
                    </div>

                    {/* Details Section */}
                    <div className="lg:w-2/3">
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight logo-font tracking-wider">
                                {movie.Title.toUpperCase()}
                            </h1>
                            <button
                                onClick={() => toggleFavorite(movie)}
                                className={`p-4 rounded-full transition duration-300 transform hover:scale-110 ${
                                    isFav 
                                    ? 'bg-red-600 text-white shadow-xl shadow-red-900/50' 
                                    : 'bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-gray-700'
                                }`}
                                title={isFav ? "Remove from My List" : "Add to My List"}
                            >
                                <Heart className={`w-6 h-6 ${isFav ? 'fill-white' : 'fill-none stroke-current'}`} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center text-xl font-semibold text-red-500 mb-6 space-x-4 border-b border-gray-700 pb-4">
                            <span>{movie.Year}</span>
                            <span className="text-gray-600">•</span>
                            <span>{movie.Rated}</span>
                            <span className="text-gray-600">•</span>
                            <span>{movie.Runtime}</span>
                        </div>
                        
                        <p className="text-lg text-gray-300 mb-6">
                            <strong className="text-white">Genre:</strong> {movie.Genre}
                        </p>

                        <h2 className="text-2xl font-bold text-white mb-3 logo-font tracking-wide">PLOT SUMMARY</h2>
                        <p className="text-gray-400 leading-relaxed mb-8 border-b pb-6 border-gray-700">
                            {movie.Plot}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-gray-300 mb-8">
                            <DetailRow label="Director" value={movie.Director} />
                            <DetailRow label="Writer" value={movie.Writer} />
                            <DetailRow label="Actors" value={movie.Actors} />
                            <DetailRow label="Awards" value={movie.Awards} />
                            <DetailRow label="Box Office" value={movie.BoxOffice || 'N/A'} />
                            <DetailRow label="Language" value={movie.Language} />
                            <DetailRow label="Released" value={movie.Released} />
                            <DetailRow label="Country" value={movie.Country} />
                        </div>
                        
                        {/* Ratings */}
                        <h3 className="text-2xl font-bold text-white mt-6 mb-4 logo-font tracking-wide">RATINGS</h3>
                        <div className="flex flex-wrap gap-4">
                            {ratings.map((rating, index) => (
                                <div key={index} className="bg-gray-800 p-4 rounded-xl flex items-center shadow-lg min-w-[150px] border-l-4 border-red-600">
                                    <Star className="w-5 h-5 text-red-500 fill-red-500/30 mr-2 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-lg text-white">{rating.Value}</p>
                                        <p className="text-xs text-gray-400">{rating.Source}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

// Helper component for cleaner detail view
const DetailRow = ({ label, value }) => (
    <p className="flex justify-between items-start">
        <strong className="font-semibold text-white w-1/4 flex-shrink-0">{label}:</strong> 
        <span className="text-right w-3/4 text-gray-400">{value}</span>
    </p>
);

const FavoritesPage = () => {
    const { favorites } = useFavorites();
    const favoriteList = Object.values(favorites);

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center border-b pb-3 border-gray-700 logo-font tracking-wider">
                <Heart className="w-8 h-8 text-red-600 fill-red-500 mr-3" />
                MY FAVORITE TITLES (<span className="text-red-500">{favoriteList.length}</span>)
            </h1>

            {favoriteList.length === 0 ? (
                <div className="text-center py-20 bg-gray-900 rounded-xl shadow-lg border border-gray-700">
                    <p className="text-2xl text-gray-400 mb-4">You haven't added any favorites yet!</p>
                    <Link 
                        to="/" 
                        className="text-red-500 hover:text-red-400 font-semibold flex items-center justify-center transition mt-4 text-lg"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Start searching for amazing titles
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {favoriteList.map(movie => (
                        <div key={movie.imdbID} className="relative">
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

// --- MAIN APP COMPONENT ---

const App = () => {
    return (
        <Router>
            <style>
                {/* Global styles, custom font loading, and custom class */}
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Bebas+Neue&display=swap');
                    body {
                        /* Inter for general text (readability) */
                        font-family: 'Inter', sans-serif; 
                        background-color: #141414; /* Deep dark background */
                        min-height: 100vh;
                    }
                    /* Custom class for bold, condensed titles and logo */
                    .logo-font {
                        font-family: 'Bebas Neue', sans-serif;
                        letter-spacing: 2px;
                    }
                    /* Custom scrollbar for a nicer look in dark mode */
                    ::-webkit-scrollbar {
                        width: 8px;
                    }
                    ::-webkit-scrollbar-track {
                        background: #1e1e1e;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #4a4a4a;
                        border-radius: 4px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #6a6a6a;
                    }
                `}
            </style>
            <FavoritesProvider>
                <Navbar />
                <div className="min-h-[calc(100vh-80px)]">
                    <Routes>
                        <Route path="/" element={<SearchPage />} />
                        <Route path="/movie/:imdbID" element={<MovieDetail />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        {/* Fallback route - HashRouter uses paths relative to the hash */}
                        <Route path="*" element={<SearchPage />} /> 
                    </Routes>
                </div>
                <footer className="w-full text-center p-4 text-gray-500 text-sm border-t border-gray-800 mt-10 bg-black/95 shadow-inner shadow-black/50">
                    <p>Powered by OMDB API | Designed for CineStream</p>
                </footer>
            </FavoritesProvider>
        </Router>
    );
};

export default App;
