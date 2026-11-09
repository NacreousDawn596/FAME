import { Navigate, Route, Routes } from "react-router-dom";
import { CandidateApp } from "@/pages/candidate/CandidateApp";
import { OrganizerApp } from "@/pages/organizer/OrganizerApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CandidateApp />} />
      <Route path="/organizer/*" element={<OrganizerApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
