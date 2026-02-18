"use client";

import { useState, useEffect } from 'react';
import EventForm from '../../EventForm';
import { useRouter, useParams } from 'next/navigation';

import type { OrganizerEventFormData } from '@/types/organize';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams(); // Get ID from params
    const [mockData, setMockData] = useState<OrganizerEventFormData | null>(null);

    useEffect(() => {
        // Simulate fetching data based heavily on ID if needed
        // For now, return generic mock data
        setMockData({
            title: 'Nairobi Tech Summit 2024',
            description: 'Join the biggest tech conference in East Africa...',
            category: 'Arts&Entertainment',
            tags: ['tech', 'networking'],
            isOnline: false,
            location: 'KICC, Nairobi',
            startDate: '2024-10-12',
            startTime: '09:00',
            endDate: '2024-10-12',
            endTime: '17:00',
            isPrivate: false,
            isPaid: true,
            limit: '1000',
            tickets: [
                { name: 'Regular', price: '1500', quantity: '500' },
                { name: 'VIP', price: '5000', quantity: '50' }
            ]
        });
    }, []);

    const handleUpdate = async (data: OrganizerEventFormData) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Updating event:", data);
        router.push('/dashboard/events');
    };

    if (!mockData) return <div>Loading...</div>;

    return (
        <EventForm
            pageTitle="Edit Event"
            submitBtnText="Save Changes"
            onSubmit={handleUpdate}
            initialData={mockData}
            isEditMode={true}
        />
    );
}
