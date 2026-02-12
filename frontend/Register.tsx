import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Trash2, Lock, Mail, MapPin, User, Recycle } from "lucide-react";
import { setUser } from "../lib/storage";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "volunteer",
    location: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.location) newErrors.location = "Location is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log("Registered:", formData);
      setUser(formData);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-brand-pale overflow-hidden font-sans">
      {/* Decorative Background Blob */}
      <div className="absolute bottom-0 left-0 w-[40%] h-[100vh] bg-brand-medium rounded-tr-[200px] hidden lg:block shadow-2xl z-0"></div>

      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <div className="flex w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[700px]">

          {/* Left Side - Decorative (Hidden on mobile) */}
          <div className="hidden lg:block w-5/12 bg-brand-medium p-12 text-white flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-brand-light opacity-20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-dark opacity-30 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 text-center space-y-6">
              <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-slow">
                <Recycle className="w-14 h-14 text-white" />
              </div>
              <h3 className="text-3xl font-bold">Start Your Journey</h3>
              <p className="text-brand-pale text-lg max-w-sm mx-auto leading-relaxed">
                Become part of a community dedicated to reducing waste. Schedule pickups, track your impact, and make a difference.
              </p>

            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center lg:text-left mb-6">
              <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-brand-dark font-bold text-xl mb-4">
                <Trash2 className="w-6 h-6 text-brand-medium" />
                WASTEZERO
              </Link>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Create Account</h2>
              <p className="text-gray-500 text-sm">Join us today! Please fill in your details.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 rounded-lg"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        placeholder="john@example.com"
                        className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 rounded-lg"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={errors.email}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="role">Role</Label>
                    <div className="relative">
                      <select
                        id="role"
                        className="w-full h-10 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-brand-medium focus:ring-2 focus:ring-brand-medium/20 outline-none appearance-none"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="volunteer">Volunteer</option>
                        <option value="ngo">NGO</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="location"
                        placeholder="New York, NY"
                        className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 rounded-lg"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        error={errors.location}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 rounded-lg"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={errors.password}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 rounded-lg"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        error={errors.confirmPassword}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-start mb-6">
                  <div className="flex items-center h-5">
                    <input id="terms" type="checkbox" className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-brand-medium/20" required />
                  </div>
                  <label htmlFor="terms" className="ml-2 text-sm font-medium text-gray-500">I agree with the <a href="#" className="text-brand-medium hover:underline">Terms and Conditions</a></label>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-brand-medium hover:bg-brand-dark text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                  isLoading={isLoading}
                >
                  Create Account
                </Button>
              </div>

              <div className="text-center mt-6">
                <p className="text-gray-500 text-sm">
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-brand-medium hover:text-brand-dark transition-colors underline decoration-2 decoration-transparent hover:decoration-brand-medium animation-all">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
