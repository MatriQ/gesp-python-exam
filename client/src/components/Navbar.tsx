import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navLinks = [
  { to: '/questions', label: '题库' },
  { to: '/practice', label: '练习' },
  { to: '/exam', label: '模拟考试' },
  { to: '/errors', label: '错题本' },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-16 flex items-center px-3 md:px-6">
      <Link to="/" className="font-bold text-blue-600 text-lg md:text-xl shrink-0">
        GESP Python
      </Link>

      <div className="flex-1 flex justify-center gap-2 md:gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-gray-600 hover:text-blue-600 transition-colors text-sm md:text-base"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="shrink-0 flex items-center gap-2 md:gap-3">
        {isAuthenticated && user ? (
          <>
            <span className="text-gray-600">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              退出
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
              登录
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors text-sm"
            >
              注册
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
