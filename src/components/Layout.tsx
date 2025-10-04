import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FiGrid, FiShoppingCart, FiUsers, FiArchive, FiBarChart2, FiLogOut, FiMoon, FiSun, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { motion } from "framer-motion";
import LanguageSwitcher from './LanguageSwitcher'; 

const useTheme = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
};

const Layout = () => {
  const [isCollapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // تعريف اللون الأساسي - هذا هو لون الـ Sky-600 العصري
  const primaryColorClass = "sky-600"; 
  
  const baseLinkClass =
    `flex items-center gap-3 p-3 rounded-xl hover:bg-sky-100 dark:hover:bg-slate-700 transition-all duration-200`;
  
  // تصحيح: استخدام الـ Template Literal لدمج المتغير
  const activeLinkClass = `bg-${primaryColorClass} text-white shadow-md shadow-${primaryColorClass}/30`;

  const NavItem = ({
    to,
    icon,
    label,
  }: {
    to: string;
    icon: React.ReactNode;
    label: string;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseLinkClass} ${
          // تصحيح: استخدام الـ Template Literal لدمج المتغير
          isActive ? activeLinkClass : `text-slate-700 dark:text-slate-300 hover:text-${primaryColorClass}`
        }`
      }
    >
      {icon}
      {!isCollapsed && <span className="font-medium text-sm">{label}</span>}
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - الشريط الجانبي */}
      <aside
        className={`bg-slate-900 shadow-2xl shadow-black/20 text-white flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* منطقة الشعار والعنوان */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center h-16">
          {/* تصحيح: استخدام الـ Template Literal لدمج المتغير */}
          <h1 className={`text-2xl font-extrabold text-${primaryColorClass}`}>
            {isCollapsed ? "P" : "Premium POS"}
          </h1>
          {/* زر الطي / الفتح */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className={`text-slate-400 hover:text-${primaryColorClass} transition-colors p-1 rounded-full hover:bg-slate-700`}
          >
            {isCollapsed ? <FiChevronsRight size={20} /> : <FiChevronsLeft size={20} />}
          </button>
        </div>

        {/* قائمة التنقل */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
          <NavItem to="/dashboard" icon={<FiGrid size={20} />} label="Dashboard" />
          <NavItem to="/pos" icon={<FiShoppingCart size={20} />} label="POS" />
<NavItem to="/inventory" icon={<FiArchive size={20} />} label="Inventory" />
<NavItem to="/customers" icon={<FiUsers size={20} />} label="Customers" />
<NavItem to="/reports" icon={<FiBarChart2 size={20} />} label="Reports" />
 <NavItem to="/reports/sold-products" icon={<FiShoppingCart size={20} />} label="Sold" />
</nav>


        {/* منطقة إعدادات الثيم وتسجيل الخروج في الأسفل */}
        <div className="p-4 border-t border-slate-700 space-y-2">
            <button
                onClick={toggleTheme}
                // تصحيح: استخدام الـ Template Literal لدمج المتغير
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-slate-400 hover:bg-slate-700 hover:text-${primaryColorClass}`}
            >
                {theme === "light" ? <FiMoon size={20} /> : <FiSun size={20} />}
                {!isCollapsed && <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>}
            </button>
            <button className={`w-full flex items-center gap-3 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                <FiLogOut size={20} />
                {!isCollapsed && <span>Logout</span>}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - الشريط العلوي */}
        <header className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-md shadow-black/5 h-16">
          {/* العنوان الديناميكي */}
          <h2 className="text-xl font-extrabold text-slate-700 dark:text-slate-200">
            {location.pathname.substring(1).split('/')[0].toUpperCase() || "WELCOME"}
          </h2>
          <div className="flex items-center gap-4">
   <LanguageSwitcher />

                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Admin | Premium Store
                </div>
          </div>
        </header>

        {/* Animated Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 custom-scrollbar">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;