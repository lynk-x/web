import CreateEventForm from '@/components/dashboard/CreateEventForm';

export default function CreateEventPage() {
    return (
        <div>
            <h1 style={{ marginBottom: 32, fontSize: 28, fontWeight: 'bold' }}>Create New Event</h1>
            <CreateEventForm />
        </div>
    );
}
