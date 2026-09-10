import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProfileMenu() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/"); // Redirect to Home Page on logout
  };

  return (
    <div className="profile-menu">
      {/* ... your existing dropdown menu JSX ... */}
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}

export default ProfileMenu;