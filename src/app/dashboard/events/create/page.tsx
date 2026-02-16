"use client";

import React from 'react';
import EventForm from '../EventForm';
import { useRouter } from 'next/navigation';

export default function CreateEventPage() {
    const router = useRouter();

    const handleCreate = async (data: any) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Creating event:", data);
        router.push('/dashboard/events');
    };

    return (
        <EventForm
            pageTitle="Create New Event"
            submitBtnText="Publish Event"
            onSubmit={handleCreate}
        />
    );
}
