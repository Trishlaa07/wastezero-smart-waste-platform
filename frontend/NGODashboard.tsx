import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { clearUser, getUser, getOpportunities, addOpportunity, deleteOpportunity, updateOpportunity } from "../lib/storage";
import type { Opportunity } from "../types";
import { useEffect, useState } from "react";
import { OpportunityForm } from "../components/OpportunityForm";
import { OpportunityCard } from "../components/OpportunityCard";

export default function NGODashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ name: string; id?: string } | null>(null);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);

    useEffect(() => {
        const userData = getUser();
        if (!userData) {
            navigate("/");
            return;
        }
        setUser(userData);
        loadOpportunities();
    }, [navigate]);

    const loadOpportunities = () => {
        // In a real app, filter by ngo_id. Here we show all for simplicity or filter if we had IDs.
        // Assuming mock user doesn't have a stable ID, we just show all for demo.
        setOpportunities(getOpportunities());
    };

    const handleCreate = (data: any) => {
        const newOpp: Opportunity = {
            id: Date.now().toString(),
            ngo_id: user?.id || "ngo_1", // Mock ID
            ...data,
            status: "open",
        };
        addOpportunity(newOpp);
        setIsCreating(false);
        loadOpportunities();
    };

    const handleUpdate = (data: any) => {
        if (!editingOpp) return;
        updateOpportunity({ ...editingOpp, ...data });
        setEditingOpp(null);
        loadOpportunities();
    };

    const handleDelete = (id: string) => {
        deleteOpportunity(id);
        loadOpportunities();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">NGO Dashboard</h1>
                        <p className="text-gray-600">Organization: {user?.name}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="primary" onClick={() => setIsCreating(true)}>Post Opportunity</Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                clearUser();
                                navigate("/");
                            }}
                        >
                            Sign Out
                        </Button>
                    </div>
                </header>

                {isCreating && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Create New Opportunity</h2>
                        <OpportunityForm
                            onSubmit={handleCreate}
                            onCancel={() => setIsCreating(false)}
                        />
                    </div>
                )}

                {editingOpp && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Edit Opportunity</h2>
                        <OpportunityForm
                            initialData={editingOpp}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingOpp(null)}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {opportunities.map(opp => (
                        <OpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            userRole="ngo"
                            onEdit={setEditingOpp}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>

                {opportunities.length === 0 && !isCreating && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 py-8">No opportunities posted yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
