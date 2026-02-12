export interface Opportunity {
    id: string;
    ngo_id: string;
    title: string;
    description: string;
    location: string;
    date: string;
    duration: string;
    status: 'open' | 'closed' | 'in-progress';
}
