import { Guest } from '@/types/guest';

export const initialGuests: Guest[] = [
    { id: '1', name: 'Alex M.', email: 'alex@example.com', ticketType: 'VIP', status: 'Checked In', purchaseDate: 'Oct 10' },
    { id: '2', name: 'Sarah J.', email: 'sarah@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 11' },
    { id: '3', name: 'Michael B.', email: 'mike@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 12' },
    { id: '4', name: 'Emma W.', email: 'emma@example.com', ticketType: 'Early Bird', status: 'Checked In', purchaseDate: 'Sept 28' },
    { id: '5', name: 'David L.', email: 'david@example.com', ticketType: 'VIP', status: 'Pending', purchaseDate: 'Oct 05' },
    { id: '6', name: 'Lisa K.', email: 'lisa@example.com', ticketType: 'Standard', status: 'Pending', purchaseDate: 'Oct 12' },
];
