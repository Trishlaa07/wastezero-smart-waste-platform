import type { Opportunity } from "../types";
import { Button } from "./ui/Button";
import { Calendar, Clock, MapPin } from "lucide-react";

interface OpportunityCardProps {
    opportunity: Opportunity;
    userRole: string;
    onEdit?: (opp: Opportunity) => void;
    onDelete?: (id: string) => void;
    onApply?: (id: string) => void;
}

export function OpportunityCard({ opportunity, userRole, onEdit, onDelete, onApply }: OpportunityCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{opportunity.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{opportunity.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${opportunity.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {opportunity.status}
                </span>
            </div>

            <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {opportunity.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {opportunity.date}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {opportunity.duration}
                </div>
            </div>

            <div className="mt-6 flex gap-2">
                {userRole === 'ngo' && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => onEdit?.(opportunity)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => onDelete?.(opportunity.id)}>Delete</Button>
                    </>
                )}
                {userRole === 'volunteer' && (
                    <Button variant="primary" size="sm" onClick={() => onApply?.(opportunity.id)}>Apply Now</Button>
                )}
            </div>
        </div>
    );
}
