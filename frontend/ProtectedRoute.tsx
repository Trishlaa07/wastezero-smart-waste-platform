import { Navigate } from "react-router-dom";
import { getUser } from "../lib/storage"; // Make sure this path matches your project

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = getUser();

  // If no user found in storage, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user exists, show the page
  return children;
}
