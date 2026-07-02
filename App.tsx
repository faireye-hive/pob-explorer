import React, { useState } from "react";
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import MarketPools from "./components/MarketPools";
import Explorer from "./components/Explorer";
import SinglePost from "./components/SinglePost";
import Feed from "./components/Feed";
import Profile from "./components/Profile";
import HiddenUsers from "./components/HiddenUsers";
import CreatePost from "./components/CreatePost";
import Discovery from "./components/Discovery";
import {
  LayoutDashboard,
  Wallet,
  Search,
  Coins,
  Newspaper,
  LogIn,
  LogOut,
  User,
  Edit3,
  Compass,
  Rss,
  Sun,
  Moon,
  Droplets,
  MessageSquare,
  Globe2,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useCommunity } from "./contexts/CommunityContext";
import {
  LanguageProvider,
  useLanguage,
  Language,
} from "./contexts/LanguageContext";

import Chat from "./components/Chat";

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1 sm:mr-2"
      title="Alternar Tema"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
      className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1 sm:mr-2 flex items-center gap-1"
      title={language === "pt" ? "Switch to English" : "Mudar para Português"}
    >
      <Globe2 size={20} />
      <span className="text-xs font-bold uppercase">{language}</span>
    </button>
  );
};

const NavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${active ? "bg-cent/10 text-cent font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

const MobileNavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-1 w-full py-2 transition-all ${active ? "text-cent" : "text-slate-500 hover:text-slate-300"}`}
    >
      {React.cloneElement(icon as React.ReactElement, {
        className: active ? "drop-shadow-md" : "",
      })}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
};

const LoginButton: React.FC = () => {
  const { user, login, logout, isKeychainInstalled } = useAuth();
  const [usernameInput, setUsernameInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput) return;
    setLoading(true);
    try {
      await login(usernameInput);
      setIsModalOpen(false);
    } catch (err) {
      alert(t("login.error"));
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 bg-slate-800 py-1.5 px-3 rounded-full border border-slate-700 hover:border-cent transition-all"
        >
          <img
            src={`https://images.hive.blog/u/${user}/avatar`}
            alt={user}
            className="w-6 h-6 rounded-full border border-green-500"
          />
          <span className="text-sm font-bold text-white hidden sm:inline">
            {user}
          </span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            ></div>
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in py-1">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <User size={16} /> {t("nav.profile")}
              </Link>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <LayoutDashboard size={16} /> {t("nav.dashboard")}
              </Link>
              <Link
                to="/hidden-users"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <User size={16} /> {t("nav.hiddenUsers")}
              </Link>
              <div className="border-t border-slate-700 my-1"></div>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-400/10 transition-colors text-left"
              >
                <LogOut size={16} /> {t("nav.logout")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-cent text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-400 transition-all"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">{t("nav.login")}</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="text-cent" /> {t("login.title")}
            </h3>

            {!isKeychainInstalled ? (
              <div className="text-red-400 text-sm mb-4">
                {t("login.noKeychain")}
                <a
                  href="https://hive-keychain.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-2 underline text-white"
                >
                  {t("login.downloadKeychain")}
                </a>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">
                    {t("login.username")}
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) =>
                      setUsernameInput(e.target.value.toLowerCase())
                    }
                    placeholder="ex: hiveio"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cent outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !usernameInput}
                  className="w-full bg-cent hover:bg-green-400 text-slate-900 font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? t("login.checking") : t("login.submit")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const AppContent: React.FC = () => {
  const { community } = useCommunity();
  const { user } = useAuth();
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-dark text-slate-200 font-sans selection:bg-cent/30">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-dark/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-cent to-green-600 rounded-lg flex items-center justify-center text-slate-900 font-bold">
                {community[0]}
              </div>
              <span className="text-xl font-bold text-white tracking-tight hidden sm:inline">
                {community}
                <span className="text-cent">Explorer</span>
              </span>
              <span className="text-lg font-bold text-white tracking-tight sm:hidden">
                {community}
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex flex-1 justify-center gap-1 xl:gap-2 px-4 shadow-sm mx-4">
              <NavLink
                to="/discovery"
                icon={<Compass size={18} />}
                label={t("nav.discover")}
              />
              <NavLink
                to="/explorer"
                icon={<Newspaper size={18} />}
                label={t("nav.explorer")}
              />
              {user && (
                <NavLink
                  to="/feed"
                  icon={<Rss size={18} />}
                  label={t("nav.feed")}
                />
              )}
              {user && (
                <NavLink
                  to="/pools"
                  icon={<Droplets size={18} />}
                  label={t("nav.pools")}
                />
              )}
              {user && (
                <NavLink
                  to="/chat"
                  icon={<MessageSquare size={18} />}
                  label={t("nav.chat")}
                />
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {user && (
                <Link
                  to="/create-post"
                  className="flex items-center gap-2 bg-cent text-slate-900 px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-green-400 transition-all mr-2"
                >
                  <Edit3 size={16} />
                  <span className="hidden sm:inline">{t("nav.post")}</span>
                </Link>
              )}
              <LanguageToggle />
              <ThemeToggle />
              <LoginButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <MobileNavLink
          to="/discovery"
          icon={<Compass size={22} />}
          label={t("nav.discover")}
        />
        <MobileNavLink
          to="/explorer"
          icon={<Newspaper size={22} />}
          label={t("nav.explorer")}
        />
        {user && (
          <MobileNavLink
            to="/feed"
            icon={<Rss size={22} />}
            label={t("nav.feed")}
          />
        )}
        {user && (
          <MobileNavLink
            to="/pools"
            icon={<Droplets size={22} />}
            label={t("nav.pools")}
          />
        )}
        {user && (
          <MobileNavLink
            to="/chat"
            icon={<MessageSquare size={22} />}
            label={t("nav.chat")}
          />
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16 md:mb-0">
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={user ? <Dashboard /> : <Explorer />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/pools" element={<MarketPools />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile/:username?" element={<Profile />} />
          <Route path="/hidden-users" element={<HiddenUsers />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/post/:author/:permlink" element={<SinglePost />} />
          <Route path="/:author/:permlink" element={<SinglePost />} />
        </Routes>

        {backgroundLocation && (
          <Routes>
            <Route path="/post/:author/:permlink" element={<SinglePost />} />
            <Route path="/:author/:permlink" element={<SinglePost />} />
          </Routes>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-8 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">{t("footer.text")}</p>
          <div className="flex justify-center gap-4 mt-4 text-slate-600 text-sm">
            <span>BYTE Community</span>
            <span>•</span>
            <span>Programmers & Code</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </Router>
  );
};

export default App;
