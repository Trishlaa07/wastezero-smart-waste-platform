import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { Recycle, Leaf, Trash2 } from "lucide-react";

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen bg-white overflow-hidden font-sans">
            {/* Background Shapes - Updated to Blue */}
            <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 left-0 w-[45%] h-[120vh] bg-blue-600 rounded-br-[200px] z-0 hidden lg:block shadow-2xl"></div>
            <div className="absolute bottom-0 right-0 w-[40%] h-[70vh] bg-blue-50 rounded-tl-[200px] z-0 opacity-80"></div>

            {/* Navigation */}
            <nav className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
                <div className="text-2xl font-bold tracking-wider text-blue-900 lg:text-white flex items-center gap-2">
                    <Trash2 className="w-8 h-8" />
                    WASTEZERO
                </div>
                <div className="hidden md:flex space-x-8 text-gray-600 font-medium">
                    <a href="#" className="hover:text-blue-600 transition-colors">Home</a>
                    <a href="#" className="hover:text-blue-600 transition-colors">About</a>
                    <a href="#" className="hover:text-blue-600 transition-colors">Portfolio</a>
                    <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
                </div>
                <div className="block">
                    <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-600 hover:text-blue-600 hidden md:inline-flex">Sign In</Button>
                    <Button variant="primary" onClick={() => navigate('/register')} className="ml-2 bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-white shadow-md">Sign Up</Button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 lg:pt-32 flex flex-col lg:flex-row items-center">

                {/* Left Content (Image Placeholder) */}
                <div className="w-full lg:w-1/2 flex justify-center lg:justify-start lg:pr-12 mb-16 lg:mb-0 relative">
                    <div className="relative w-80 h-96 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-6 transition-transform hover:rotate-0 duration-500 group">
                        {/* Simulated Bin */}
                        <div className="absolute inset-0 bg-blue-800 rounded-3xl opacity-90"></div>

                        {/* Bin Lid */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-84 h-12 bg-blue-400 rounded-t-xl shadow-lg transform group-hover:-translate-y-4 transition-transform duration-500"></div>

                        <Recycle className="w-32 h-32 text-white animate-spin-slow duration-[10s]" />

                        {/* Decorative Elements */}
                        <Leaf className="absolute -top-10 -right-10 w-20 h-20 text-blue-500 transform rotate-45" />
                        <Leaf className="absolute bottom-10 -left-10 w-16 h-16 text-blue-300 transform -rotate-12" />

                        <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-blue-900 font-bold text-xs">100%</span>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
                    <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        ZERO <br />
                        <span className="text-blue-600">WASTE</span>
                    </h1>

                    <p className="text-gray-500 text-lg lg:text-xl max-w-lg mx-auto lg:mx-0 leading-relaxed">
                        Sustainable waste management for a cleaner future. Schedule pickups, track recycling, and earn rewards for responsible disposal.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                            onClick={() => navigate('/register')}
                        >
                            Get Started
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600 rounded-full px-8 py-6 text-lg"
                        >
                            Learn More
                        </Button>
                    </div>

                    <div className="pt-12 flex items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            <span className="font-semibold text-sm">Eco-Friendly</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            <span className="font-semibold text-sm">Community Driven</span>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
