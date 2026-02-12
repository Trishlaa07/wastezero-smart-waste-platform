import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { clearUser } from "../lib/storage";

export default function AdminDashboard() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-gray-600">System Overview</p>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                        <div className="text-2xl font-bold text-gray-900 mt-2">0</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500">Active NGOs</h3>
                        <div className="text-2xl font-bold text-gray-900 mt-2">0</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500">Total Waste Recycled</h3>
                        <div className="text-2xl font-bold text-green-600 mt-2">0 kg</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500">Pending Approvals</h3>
                        <div className="text-2xl font-bold text-yellow-600 mt-2">0</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">System Activity</h3>
                    <p className="text-gray-500 text-center py-8">No recent activity.</p>
                </div>
            </div>
        </div>
    );
}
