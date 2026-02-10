"use client";

import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import EventCard from "@/components/EventCard";
import SkeletonEventCard from "@/components/SkeletonEventCard";
import AppDrawer from "@/components/AppDrawer";
import styles from "./page.module.css";

const EVENTS = [
  { id: 1, name: "[1]", date: "[1]", category: "category", active: true },
  { id: 2, name: "[1]", date: "[1]", category: "category", active: false },
  { id: 3, name: "[1]", date: "[1]", category: "category", active: false },
  { id: 4, name: "[1]", date: "[1]", category: "category", active: false },
];

/**
 * Home page component that displays the main event feed.
 * It features a search bar, a responsive grid of event cards, and a navigation drawer with filters.
 * It also handles the initial data loading simulation.
 */
export default function Home() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Simulate 1.5s load time
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.page}>
      <Navbar onMenuClick={() => setIsDrawerOpen(true)} />
      <AppDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <main className={styles.main}>
        <div className={styles.container}>
          <SearchBar />

          <div className={styles.grid}>
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                <SkeletonEventCard key={index} />
              ))
              : EVENTS.map((event) => (
                <EventCard
                  key={event.id}
                  name={event.name}
                  date={event.date}
                  category={event.category}
                  isActive={event.active}
                />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
