import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, Loader2, AlertCircle, Activity, ChevronRight, CheckCircle, ArrowRight, Filter, X, ChevronDown, RotateCcw, RefreshCw, Clock } from 'lucide-react';
import { comparePrices, getMedicineSuggestions } from '../services/gemini';
import { MedicineCard } from '../components/MedicineCard';
import { MedicinePrice } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ query: string; products: { name: string; prices: MedicinePrice[] }[] } | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 5000,
    onlyAvailable: false,
    platforms: [] as string[],
    brands: [] as string[],
    manufacturers: [] as string[]
  });
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high'>('price-low');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['brands', 'manufacturers', 'sort']);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const clearAllFilters = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 5000,
      onlyAvailable: false,
      platforms: [],
      brands: [],
      manufacturers: []
    });
  };

  const removeFilter = (type: 'brands' | 'manufacturers' | 'platforms', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].filter(v => v !== value)
    }));
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        setSelectedIndex(-1);
        return;
      }
      const list = await getMedicineSuggestions(query);
      setSuggestions(list);
      setSelectedIndex(-1);
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    e?.preventDefault();
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);
    setShowSuggestions(false);

    try {
      const products = await comparePrices(finalQuery);
      setResults({ query: finalQuery, products });
      setLastUpdated(new Date());
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Save to history if logged in
      if (auth.currentUser) {
        const path = 'searches';
        try {
          await addDoc(collection(db, path), {
            userId: auth.currentUser.uid,
            query: finalQuery,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
    } catch (err) {
      setError('Failed to fetch prices. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(undefined, suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const refreshPrices = async () => {
    if (!results || isRefreshing || loading) return;
    
    setIsRefreshing(true);
    try {
      const products = await comparePrices(results.query);
      setResults({ query: results.query, products });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh prices:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (results && !loading) {
      interval = setInterval(() => {
        refreshPrices();
      }, 60000); // Refresh every 60 seconds
    }
    return () => clearInterval(interval);
  }, [results, loading]);

  const getFilteredPrices = (prices: MedicinePrice[]) => {
    return prices
      .filter(p => {
        const priceMatch = p.price >= filters.minPrice && p.price <= filters.maxPrice;
        const availabilityMatch = !filters.onlyAvailable || p.available;
        const platformMatch = filters.platforms.length === 0 || filters.platforms.includes(p.platform);
        const brandMatch = filters.brands.length === 0 || (p.brand && filters.brands.includes(p.brand));
        const manufacturerMatch = filters.manufacturers.length === 0 || (p.manufacturer && filters.manufacturers.includes(p.manufacturer));
        return priceMatch && availabilityMatch && platformMatch && brandMatch && manufacturerMatch;
      })
      .sort((a, b) => sortBy === 'price-low' ? a.price - b.price : b.price - a.price);
  };

  const allPrices = results?.products.flatMap(p => p.prices) || [];
  const availablePlatforms = Array.from(new Set(allPrices.map(p => p.platform)));
  const availableBrands = Array.from(new Set(allPrices.map(p => p.brand).filter(Boolean) as string[]));
  const availableManufacturers = Array.from(new Set(allPrices.map(p => p.manufacturer).filter(Boolean) as string[]));

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-full text-xs font-black uppercase tracking-[0.25em] mb-8 border border-indigo-100 dark:border-indigo-800/50 shadow-sm shadow-indigo-500/5">
          <SearchIcon className="w-4 h-4 animate-pulse" />
          <span>Smart Price Comparison</span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 sm:mb-8 tracking-tighter leading-none">
          Find Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-accent-500">Prices</span>
        </h2>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Search across all major Indian pharmacies to find the most affordable medicines instantly.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-end mb-8">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-8 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm font-black text-xs uppercase tracking-widest text-indigo-600"
          >
            <Filter className="w-4 h-4" />
            <span>{isFilterOpen ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
        </div>

        {/* Filters Sidebar */}
        <AnimatePresence>
          {(isFilterOpen || window.innerWidth >= 1024) && (
            <motion.aside 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "lg:col-span-3 space-y-10 lg:!block",
                !isFilterOpen && "hidden lg:block"
              )}
            >
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm sticky top-32">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Filters</h3>
              </div>
              {(filters.brands.length > 0 || filters.manufacturers.length > 0) && (
                <button 
                  onClick={clearAllFilters}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Clear All Filters"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-8">
              {availableBrands.length > 0 && (
                <div className="border-b border-slate-50 dark:border-slate-800 pb-8">
                  <button 
                    onClick={() => toggleSection('brands')}
                    className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-4 group"
                  >
                    <span>Brands</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections.includes('brands') ? "rotate-180" : "")} />
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.includes('brands') && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-2">
                          {availableBrands.map(brand => (
                            <label key={brand} className="flex items-center space-x-4 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input 
                                  type="checkbox" 
                                  checked={filters.brands.includes(brand)}
                                  onChange={(e) => {
                                    const next = e.target.checked 
                                      ? [...filters.brands, brand]
                                      : filters.brands.filter(b => b !== brand);
                                    setFilters({...filters, brands: next});
                                  }}
                                  className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 transition-all cursor-pointer"
                                />
                              </div>
                              <span className={cn(
                                "text-sm font-bold transition-colors",
                                filters.brands.includes(brand) ? "text-indigo-600" : "text-slate-600 dark:text-slate-400 group-hover:text-indigo-600"
                              )}>{brand}</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {availableManufacturers.length > 0 && (
                <div className="border-b border-slate-50 dark:border-slate-800 pb-8">
                  <button 
                    onClick={() => toggleSection('manufacturers')}
                    className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-4 group"
                  >
                    <span>Manufacturers</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections.includes('manufacturers') ? "rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                    {expandedSections.includes('manufacturers') && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-2">
                          {availableManufacturers.map(manufacturer => (
                            <label key={manufacturer} className="flex items-center space-x-4 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input 
                                  type="checkbox" 
                                  checked={filters.manufacturers.includes(manufacturer)}
                                  onChange={(e) => {
                                    const next = e.target.checked 
                                      ? [...filters.manufacturers, manufacturer]
                                      : filters.manufacturers.filter(m => m !== manufacturer);
                                    setFilters({...filters, manufacturers: next});
                                  }}
                                  className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 transition-all cursor-pointer"
                                />
                              </div>
                              <span className={cn(
                                "text-sm font-bold transition-colors",
                                filters.manufacturers.includes(manufacturer) ? "text-indigo-600" : "text-slate-600 dark:text-slate-400 group-hover:text-indigo-600"
                              )}>{manufacturer}</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div>
                <button 
                  onClick={() => toggleSection('sort')}
                  className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-4 group"
                >
                  <span>Sort By Price</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedSections.includes('sort') ? "rotate-180" : "")} />
                </button>

                <AnimatePresence>
                  {expandedSections.includes('sort') && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex p-2 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-inner mt-2">
                        <button
                          onClick={() => setSortBy('price-low')}
                          className={cn(
                            "flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            sortBy === 'price-low'
                              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl shadow-indigo-500/10"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          <span>Low</span>
                        </button>
                        <button
                          onClick={() => setSortBy('price-high')}
                          className={cn(
                            "flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            sortBy === 'price-high'
                              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl shadow-indigo-500/10"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          <span>High</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

        {/* Search Results */}
        <main className="lg:col-span-9 space-y-12">
          <div className="relative group" ref={suggestionRef}>
            <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
              <SearchIcon className={cn(
                "h-7 w-7 transition-colors",
                loading ? "text-indigo-500 animate-pulse" : "text-slate-400 group-focus-within:text-indigo-600"
              )} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search for medicines..."
              className="block w-full pl-12 md:pl-20 pr-32 md:pr-64 py-5 md:py-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] md:rounded-[3rem] text-base md:text-xl font-medium focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all outline-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
            
            <div className="absolute right-2 md:right-4 top-2 md:top-4 bottom-2 md:bottom-4 flex items-center space-x-2 md:space-x-3">
              {query && !loading && (
                <button
                  onClick={clearSearch}
                  className="p-3 md:p-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query}
                className={cn(
                  "bg-indigo-600 text-white px-6 md:px-12 h-full rounded-[1.5rem] md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center space-x-2 md:space-x-3 shadow-xl shadow-indigo-500/20",
                  loading ? "bg-indigo-500 cursor-not-allowed" : "hover:bg-indigo-700 hover:shadow-indigo-500/40"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 md:w-5 h-5 animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4 md:w-5 h-5" />
                )}
                <span className="hidden sm:inline">{loading ? 'Searching' : 'Search'}</span>
              </button>
            </div>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-20 mt-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Suggested Medicines</span>
                  </div>
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between px-10 py-6 transition-colors text-left group",
                        selectedIndex === idx 
                          ? "bg-indigo-50 dark:bg-indigo-900/30" 
                          : "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
                      )}
                    >
                      <div className="flex items-center space-x-5">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          selectedIndex === idx 
                            ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600"
                        )}>
                          <SearchIcon className="w-5 h-5" />
                        </div>
                        <span className={cn(
                          "font-black transition-colors",
                          selectedIndex === idx 
                            ? "text-indigo-900 dark:text-white" 
                            : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-900 dark:group-hover:text-white"
                        )}>{suggestion}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {selectedIndex === idx && (
                          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest hidden sm:block">Press Enter</span>
                        )}
                        <ChevronRight className={cn(
                          "w-5 h-5 transition-all",
                          selectedIndex === idx ? "text-indigo-600 translate-x-1" : "text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1"
                        )} />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Filters Section */}
          <AnimatePresence>
            {(filters.brands.length > 0 || filters.manufacturers.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Active Filters:</span>
                {filters.brands.map(brand => (
                  <button 
                    key={brand}
                    onClick={() => removeFilter('brands', brand)}
                    className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-all group"
                  >
                    <span>{brand}</span>
                    <X className="w-3 h-3 group-hover:scale-125 transition-transform" />
                  </button>
                ))}
                {filters.manufacturers.map(manufacturer => (
                  <button 
                    key={manufacturer}
                    onClick={() => removeFilter('manufacturers', manufacturer)}
                    className="flex items-center space-x-2 bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-accent-100 dark:border-accent-800/50 hover:bg-accent-100 transition-all group"
                  >
                    <span>{manufacturer}</span>
                    <X className="w-3 h-3 group-hover:scale-125 transition-transform" />
                  </button>
                ))}
                <button 
                  onClick={clearAllFilters}
                  className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest ml-2 underline underline-offset-4"
                >
                  Clear All
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-[3rem] flex items-center space-x-5 border border-red-100 dark:border-red-900/30 shadow-sm shadow-red-500/5">
              <AlertCircle className="w-7 h-7" />
              <span className="font-black text-sm uppercase tracking-widest">{error}</span>
            </div>
          )}

          <div ref={resultsRef} className="space-y-8 md:space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 gap-10">
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Searching Live Platforms...</p>
                    <p className="text-sm text-slate-400 font-medium tracking-widest uppercase">Checking Tata 1mg, Apollo, Netmeds & more</p>
                  </div>
                </div>
                {[1, 2].map(i => (
                  <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 animate-pulse shadow-sm" />
                ))}
              </div>
            ) : results && results.products.length > 0 ? (
              <div className="space-y-8 md:space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 md:px-4">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg md:rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 md:w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Comparison Results</h3>
                  </div>

                  {lastUpdated && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={refreshPrices}
                        disabled={isRefreshing}
                        className={cn(
                          "flex items-center space-x-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 transition-all group",
                          isRefreshing && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <RefreshCw className={cn("w-3 h-3 text-indigo-600", isRefreshing && "animate-spin")} />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 gap-8 md:gap-12"
                >
                  {(() => {
                    const visibleProducts = results.products.filter(p => getFilteredPrices(p.prices).length > 0);
                    
                    if (visibleProducts.length === 0) {
                      return (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Filter className="w-8 h-8 text-slate-300" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Filters are too strict</h4>
                          <p className="text-sm text-slate-400 font-medium tracking-widest uppercase mb-6">No medicines match your current filter settings.</p>
                          <button
                            onClick={clearAllFilters}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      );
                    }

                    return visibleProducts.map((product, idx) => (
                      <MedicineCard key={idx} medicineName={product.name} prices={getFilteredPrices(product.prices)} />
                    ));
                  })()}
                </motion.div>
              </div>
            ) : !results && !loading && (
              <div className="text-center py-32 bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 group">
                <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-700">
                  <SearchIcon className="w-16 h-16 text-slate-200 dark:text-slate-700" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">
                  Find Best Prices
                </h3>
                <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Try searching for common medicines like Paracetamol or scan your prescription.
                </p>
              </div>
            )}

            {results && results.products.length === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 space-y-8 px-6">
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 mb-10 group-hover:rotate-12 transition-transform duration-500">
                    <SearchIcon className="w-12 h-12" />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase tracking-widest leading-tight">
                      Hmm, No matches for <span className="text-indigo-600">"{results.query}"</span>
                    </h3>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                      Don't give up! Try searching for the generic salt name, check for typos, or try one of the popular medicines below. We're here to help you save!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                    <button
                      onClick={() => inputRef.current?.focus()}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-3 active:scale-95 group/btn"
                    >
                      <RotateCcw className="w-4 h-4 group-hover/btn:-rotate-180 transition-transform duration-500" />
                      <span>Refine Search</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuery('');
                        inputRef.current?.focus();
                      }}
                      className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-100 dark:border-slate-800 transition-all shadow-sm active:scale-95"
                    >
                      New Medicine Search
                    </button>
                  </div>

                  <div className="pt-12 border-t border-slate-50 dark:border-slate-800 max-w-md mx-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Popular Medicines</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {['Paracetamol', 'Azithromycin', 'Dolo 650', 'Pantoprazole'].map(item => (
                        <button
                          key={item}
                          onClick={() => {
                            setQuery(item);
                            handleSearch(undefined, item);
                          }}
                          className="px-5 py-2 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-500 hover:border-indigo-600 hover:text-indigo-600 transition-all bg-slate-50/50 dark:bg-slate-800/20 uppercase tracking-widest"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Express Delivery Promo in Search Page */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] bg-slate-950 dark:bg-accent-600 text-white relative overflow-hidden group cursor-pointer shadow-2xl shadow-slate-900/20"
            onClick={() => window.location.href = '/express-delivery'}
          >
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-700 shadow-inner">
                  <Activity className="w-7 h-7 md:w-10 md:h-10 text-accent-400 group-hover:text-white transition-colors animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xl md:text-3xl font-black tracking-tighter leading-none mb-1 md:mb-2">Need it faster?</h4>
                  <p className="text-accent-100/70 text-xs md:text-base font-medium">Get medicines in <span className="text-white font-black underline decoration-accent-400 decoration-4 underline-offset-8">less than 1 hour</span></p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto bg-white text-slate-950 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-accent-50 transition-all shadow-2xl flex items-center justify-center space-x-2 md:space-x-3 group/btn"
              >
                <span>Order Now</span>
                <ArrowRight className="w-4 h-4 md:w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </motion.button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-24 -mb-24 blur-3xl" />
          </motion.div>
        </main>
      </div>
    </div>
  );
};
