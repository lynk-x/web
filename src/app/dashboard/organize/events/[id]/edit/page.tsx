"use client";

import { useState, useEffect } from 'react';
import EventForm from '../../EventForm';
import { useRouter, useParams } from 'next/navigation';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams(); // Get ID from params
    const [mockData, setMockData] = useState<any>(null);

    useEffect(() => {
        // Simulate fetching data based heavily on ID if needed
        // For now, return generic mock data
        setMockData({
            title: 'Nairobi Tech Summit 2024',
            date: '2024-10-12',
            time: '09:00',
            location: 'KICC, Nairobi',
            description: 'Join the biggest tech conference in East Africa...',
            tickets: [
                { name: 'Regular', price: '1500', quantity: '500' },
                { name: 'VIP', price: '5000', quantity: '50' }
            ]
        });
    }, []);

    const handleUpdate = async (data: any) => {
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
