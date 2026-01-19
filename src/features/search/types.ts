// Search feature types
export interface SearchResult {
    id: string;
    title: string;
    year: string;
    type: 'Movie' | 'Series';
    posterUrl: string;
}

export interface SearchHistoryItem {
    id: string;
    query: string;
    createdAt: string;
}
