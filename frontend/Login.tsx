import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Trash2, Lock, Mail } from "lucide-react";
import { setUser } from "../lib/storage";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
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
      console.log("Logged in:", formData);
      // Mock user for login
      setUser({ ...formData, role: 'volunteer', name: 'User' });
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-brand-pale overflow-hidden font-sans">
      {/* Decorative Background Blob */}
      <div className="absolute top-0 right-0 w-[40%] h-[100vh] bg-brand-medium rounded-bl-[200px] hidden lg:block shadow-2xl z-0"></div>
      <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl hidden lg:block z-0"></div>

      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden h-[600px]">

          {/* Left Side - Form */}
          <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            <div className="text-center lg:text-left mb-8">
              <Link to="/" className="inline-flex items-center gap-2 text-brand-dark font-bold text-xl mb-6 hover:opacity-80 transition-opacity">
                <Trash2 className="w-6 h-6 text-brand-medium" />
                WASTEZERO
              </Link>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
              <p className="text-gray-500 text-sm">Please sign in to access your dashboard.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 transition-all rounded-lg"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10 border-gray-200 focus:border-brand-medium focus:ring-brand-medium/20 transition-all rounded-lg"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={errors.password}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-medium focus:ring-brand-medium" />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-500">Remember me</label>
                </div>
                <a href="#" className="font-medium text-brand-medium hover:text-brand-dark transition-colors">Forgot password?</a>
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-medium hover:bg-brand-dark text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform"
                isLoading={isLoading}
              >
                Sign In
              </Button>

              <div className="text-center mt-6">
                <p className="text-gray-500 text-sm">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-medium text-brand-medium hover:text-brand-dark transition-colors underline decoration-2 decoration-transparent hover:decoration-brand-medium animation-all">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Right Side - Decorative (Hidden on mobile) */}
          <div className="hidden lg:block w-1/2 bg-brand-medium p-12 text-white flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-dark opacity-30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 text-center space-y-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12 hover:rotate-0 transition-transform duration-500">
                <Trash2 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold">Nature is calling!</h3>
              <p className="text-brand-pale text-lg max-w-sm mx-auto leading-relaxed">
                Join our mission to create a zero-waste world. Every small action counts towards a greener future.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
