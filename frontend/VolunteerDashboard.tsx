import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { clearUser, getUser, getOpportunities } from "../lib/storage";
import type { Opportunity } from "../types";
import { useEffect, useState } from "react";
import { OpportunityCard } from "../components/OpportunityCard";

export default function VolunteerDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ name: string } | null>(null);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

    useEffect(() => {
        const userData = getUser();
        if (!userData) {
            navigate("/");
            return;
        }
        setUser(userData);
        // Load open opportunities
        setOpportunities(getOpportunities().filter(o => o.status === 'open'));
    }, [navigate]);

    const handleApply = (id: string) => {
        alert(`Applied to opportunity ${id}! (Mock functionality)`);
        // In real app, create application record
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
                        <p className="text-gray-600">Welcome back, {user?.name}</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            clearUser();
                            navigate("/");
                        }}
                    >
                        Sign Out
                    </Button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">My Impact</h3>
                        <div className="text-3xl font-bold text-green-600">0 kg</div>
                        <p className="text-sm text-gray-500">Waste collected</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Tasks</h3>
                        <div className="text-3xl font-bold text-blue-600">0</div>
                        <p className="text-sm text-gray-500">Upcoming pickups</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Points Earned</h3>
                        <div className="text-3xl font-bold text-yellow-600">0</div>
                        <p className="text-sm text-gray-500">Redeemable points</p>
                    </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900">Available Opportunities</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {opportunities.map(opp => (
                        <OpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            userRole="volunteer"
                            onApply={handleApply}
                        />
                    ))}
                </div>

                {opportunities.length === 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 py-8">No opportunities available in your area yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
