import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom"; // Fixed duplicate imports
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { setUser } from "../lib/storage";

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Define all hooks first (useState must come before any conditional returns)
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = location.state?.email || "";
  
  // 2. Now we can do the check for missing email
  if (!email) {
    return <Navigate to="/login" replace />;
  }

  // This is mock OTP (in real app backend generates this)
  const MOCK_OTP = "123456";

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      setError("OTP is required");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (otp === MOCK_OTP) {
        // Save user after verification
        setUser({
          email,
          role: "volunteer",
          name: "User",
        });

        navigate("/dashboard");
      } else {
        setError("Invalid OTP");
      }
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-pale">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">

        <h2 className="text-2xl font-bold mb-2 text-center">
          Verify OTP
        </h2>

        <p className="text-sm text-gray-500 text-center mb-6">
          We have sent a 6-digit OTP to <br />
          <span className="font-medium text-brand-dark">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setError("");
              }}
              error={error}
              className="text-center tracking-widest text-lg"
            />
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full bg-brand-medium hover:bg-brand-dark text-white"
          >
            Verify OTP
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => alert("Resend OTP clicked")}
            className="text-sm text-brand-medium hover:underline"
          >
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}
