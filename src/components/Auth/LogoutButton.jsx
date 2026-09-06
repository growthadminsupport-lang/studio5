import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("growth_user_email");
    sessionStorage.removeItem("growth_user_email");
    // TODO: also call backend to invalidate the session/token if applicable
    navigate("/login");
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      Logout
    </button>
  );
}

export default LogoutButton;