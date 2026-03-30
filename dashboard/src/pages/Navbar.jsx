import { useNavigate } from "react-router-dom";
import { FiUser, FiLogOut } from "react-icons/fi";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear auth (adjust if you're using tokens)
    localStorage.removeItem("token");

    // Redirect to login
    navigate("/");
  };

  return (
    <div className="w-full h-16 flex items-center justify-between px-6 
      bg-white/5 backdrop-blur-md border-b border-white/10">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          📗
        </div>
        <h1 className="text-lg font-semibold text-white tracking-wide">
          TechArchive AI
        </h1>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">

        {/* Profile Button */}
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 
          transition text-white"
        >
          <FiUser size={18} />
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 
          transition text-red-400"
        >
          <FiLogOut size={18} />
        </button>

      </div>
    </div>
  );
}