"use client";

import EventForm from '../EventForm';
import { useRouter } from 'next/navigation';

import type { OrganizerEventFormData } from '@/types/organize';

export default function CreateEventPage() {
    const router = useRouter();

    const handleCreate = async (data: OrganizerEventFormData) => {
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
