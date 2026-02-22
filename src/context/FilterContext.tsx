"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
    selectedCategories: string[];
    setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
    selectedTags: string[];
    setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
    selectedDates: Date[];
    setSelectedDates: React.Dispatch<React.SetStateAction<Date[]>>;
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const clearFilters = () => {
        setSelectedCategories([]);
        setSelectedTags([]);
        setSelectedDates([]);
        setSearchTerm('');
    };

    return (
        <FilterContext.Provider value={{
            selectedCategories, setSelectedCategories,
            selectedTags, setSelectedTags,
            selectedDates, setSelectedDates,
            searchTerm, setSearchTerm,
            clearFilters
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error("useFilters must be used within a FilterProvider");
    }
    return context;
};
