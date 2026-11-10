import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import FanDisclaimer from "@/components/game/FanDisclaimer";
import Home from "@/pages/Home";
import Select from "@/pages/Select";
import Fight from "@/pages/Fight";
import Tower from "@/pages/Tower";
import Armory from "@/pages/Armory";
import Leaderboard from "@/pages/Leaderboard";
import { SignInPage, SignUpPage } from "@/pages/Auth";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ClerkAuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select" element={<Select />} />
        <Route path="/fight" element={<Fight />} />
        <Route path="/tower" element={<Tower />} />
        <Route path="/armory" element={<Armory />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <FanDisclaimer />
      <Toaster richColors />
    </ClerkAuthProvider>
  );
}
