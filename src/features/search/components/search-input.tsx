'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { getSearchHistory, deleteSearchHistoryItem, clearSearchHistory } from '@/features/search/api';
import { SearchHistory } from '@/features/search/types';
import { useRouter, useSearchParams } from 'next/navigation';

export function SearchInput() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState<SearchHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sync query with URL params
    useEffect(() => {
        const urlQuery = searchParams.get('q') || '';
        setQuery(urlQuery);
    }, [searchParams]);

    // Load history when focused
    const loadHistory = async () => {
        try {
            setIsLoading(true);
            const data = await getSearchHistory();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load search history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
        loadHistory();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteSearchHistoryItem(id);
            setHistory((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error('Failed to delete history item:', error);
        }
    };

    const handleSelect = (text: string) => {
        setQuery(text);
        setIsOpen(false);
        router.push(`/home?q=${encodeURIComponent(text)}`);
    };

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            setIsOpen(false);
            router.push(`/home?q=${encodeURIComponent(query)}`);
        }
    };

    const handleClear = () => {
        setQuery('');
        setIsOpen(false);
        router.push('/home');
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for movies, shows..."
                    className="pl-10 pr-10 bg-secondary/50 border-white/10 focus-visible:ring-primary/50 h-10 w-full"
                    onFocus={handleFocus}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearch}
                />
                {/* Clear button */}
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && history.length > 0 && !query && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-2">
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                            <span>Recent Searches</span>
                            <button
                                onClick={() => {
                                    clearSearchHistory();
                                    setHistory([]);
                                }}
                                className="text-xs hover:text-white transition-colors"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors"
                                    onClick={() => handleSelect(item.query)}
                                >
                                    <div className="flex items-center gap-3 text-sm text-gray-300 group-hover:text-white truncate">
                                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{item.query}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteItem(e, item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
