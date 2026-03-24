import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard"; 
import Profile from "./pages/Profile";

function App() {

  return (

    <Router>

      <Routes>

        <Route path="/" element={<AuthPage />} />

        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/profile" element={<Profile />} />

      </Routes>

    </Router>

  )

}

export default App;