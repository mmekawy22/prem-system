import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";

import "./App.css";
import "./index.css";

// ************ الاستيرادات الخارجية المطلوبة ************
// ملاحظة: تم افتراض أن هذه المسارات صحيحة في ملفات منفصلة
import { db } from "./db";
import { AuthProvider, useAuth } from "./context/UserContext";
import { POSProvider } from "./context/POSContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import {
  FiGrid,
  FiShoppingCart,
  FiArchive,
  FiRefreshCw,
  FiUsers,
  FiHardDrive,
  FiBarChart2,
  FiFileText,
  FiScissors,
  FiLogOut,
  FiSettings,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlusSquare,
  FiSun,
  FiMoon,
} from "react-icons/fi";

// ************ استيراد جميع مكونات الصفحات ************
// ملاحظة: هذه المكونات ستحل محل الـ stubs التي استخدمناها سابقاً
import Login from "./components/Login";
import Dashboard from "./components/dashboard/Dashboard";
import Inventory from "./components/inventory/Inventory";
import POS from "./components/pos/POS";
import Returns from "./components/returns/Returns";
import Customers from "./components/customers/Customers";
import Suppliers from "./components/suppliers/Suppliers";
import Purchases from "./components/purchases/Purchases";
import Expenses from "./components/expenses/Expenses";
import AllTransactions from "./components/transactions/AllTransactions";
import Users from "./components/users/Users";
import Reports from "./components/reports/Reports";
import ReceiptSearch from "./components/receipt/ReceiptSearch";
import ClosingShift from "./components/closing/ClosingShift";
import ShiftHistory from "./components/closing/ShiftHistory";
import SettingsPage from "./components/settings/Settings";
import LanguageSwitcher from "./components/LanguageSwitcher";
import InventoryCountPage from './components/inventory/InventoryCount';
import InventoryWorksheetPage from './components/inventory/InventoryWorksheetPage';
import SoldProductsReport from './components/reports/SoldProductsReport';
import CloseSales from "./components/CloseSales";



const API_URL = "http://192.168.1.20:3001";

// ************ Theme Hook ************
const useTheme = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
};

// ************ المكون المساعد: Sidebar ************
function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const { hasPermission, settings } = useAuth();
  const { t } = useTranslation();
  const baseLinkClass =
    "flex items-center gap-4 p-3 rounded-lg hover:bg-blue-500 hover:text-white transition-colors";
  const activeLinkClass = "bg-blue-500 text-white";

  const NavItem = ({
    to,
    permission,
    icon,
    labelKey,
  }: {
    to: string;
    permission: string;
    icon: React.ReactNode;
    labelKey: string;
  }) => {
    // يجب التحقق من حالة المستخدم و الصلاحية
    // بما أن ProtectedRoute يضمن أن المستخدم مسجل، نكتفي بالصلاحية
    if (!hasPermission(permission)) return null;
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `${baseLinkClass} ${
            isActive ? activeLinkClass : "text-slate-600 dark:text-slate-300"
          }`
        }
      >
        {icon}
        {!isCollapsed && <span className="font-medium">{t(labelKey)}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-center items-center h-20">
        {settings?.store_logo ? (
          <img
            src={settings.store_logo}
            alt="Shop Logo"
            className={`object-contain transition-all duration-300 ${
              isCollapsed ? "max-h-10" : "max-h-12"
            }`}
          />
        ) : (
          <h1 className="text-2xl font-bold text-blue-600">
            {isCollapsed ? "P" : "POS System"}
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <NavItem
          to="/dashboard"
          permission="view_dashboard"
          icon={<FiGrid size={20} />}
          labelKey="sidebar.dashboard"
        />
        <NavItem
          to="/pos"
          permission="use_pos"
          icon={<FiShoppingCart size={20} />}
          labelKey="sidebar.pos"
        />

        {/* Manage Section */}
        <p
          className={`text-xs text-slate-400 font-semibold uppercase mt-4 ${
            isCollapsed ? "text-center" : "pl-3"
          }`}
        >
          {t("sidebar.manage", "Manage")}
        </p>
        <NavItem
          to="/inventory"
          permission="manage_inventory"
          icon={<FiArchive size={20} />}
          labelKey="sidebar.inventory"
        />
        <NavItem
          to="/returns"
          permission="process_returns"
          icon={<FiRefreshCw size={20} />}
          labelKey="sidebar.returns"
        />
        <NavItem
          to="/customers"
          permission="manage_customers"
          icon={<FiUsers size={20} />}
          labelKey="sidebar.customers"
        />
        <NavItem
          to="/suppliers"
          permission="manage_suppliers"
          icon={<FiHardDrive size={20} />}
          labelKey="sidebar.suppliers"
        />
        <NavItem
          to="/purchases"
          permission="manage_purchases"
          icon={<FiPlusSquare size={20} />}
          labelKey="sidebar.newPurchase"
        />
<NavItem
  to="/close-sales"
  permission="manage_inventory"
  icon={<FiScissors size={20} />}
  labelKey="sidebar.closeSales"
/>
        <NavItem
          to="/expenses"
          permission="manage_expenses"
          icon={<FiScissors size={20} />}
          labelKey="sidebar.expenses"
        />

        {/* System Section */}
        <p
          className={`text-xs text-slate-400 font-semibold uppercase mt-4 ${
            isCollapsed ? "text-center" : "pl-3"
          }`}
        >
          {t("sidebar.system", "System")}
        </p>
        <NavItem
          to="/transactions"
          permission="view_all_transactions"
          icon={<FiFileText size={20} />}
          labelKey="sidebar.allTransactions"
        />
        <NavItem
          to="/reports"
          permission="view_all_reports"
          icon={<FiBarChart2 size={20} />}
          labelKey="sidebar.reports"
        />
<NavItem
  to="/reports/sold-products"
  permission="view_sold_products"
  icon={<FiShoppingCart size={20} />}
  labelKey="sidebar.soldProducts"
/>

        <NavItem
          to="/search-receipts"
          permission="search_receipts"
          icon={<FiFileText size={20} />}
          labelKey="sidebar.searchReceipts"
        />
        <NavItem
          to="/shift-history"
          permission="view_shift_history"
          icon={<FiFileText size={20} />}
          labelKey="sidebar.shiftHistory"
        />
        <NavItem
          to="/close-shift"
          permission="close_shift"
          icon={<FiScissors size={20} />}
          labelKey="sidebar.closeShift"
        />
        <NavItem
          to="/users"
          permission="manage_users"
          icon={<FiUsers size={20} />}
          labelKey="sidebar.users"
        />
        <NavItem
          to="/settings"
          permission="manage_settings"
          icon={<FiSettings size={20} />}
          labelKey="sidebar.settings"
        />
      </nav>
    </aside>
  );
}

// ************ المكون المساعد: Layout ************
function Layout() {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  // يتم استخدام useAuth لأن Layout يقع داخل AuthProvider في App
  const { user, logout, settings } = useAuth();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Hotkeys
  useHotkeys("ctrl+i", (e) => {
    e.preventDefault();
    navigate("/inventory");
  }, { enableOnFormTags: true }, [navigate]); // Add navigate to dependencies
  
  useHotkeys("ctrl+r", (e) => {
    e.preventDefault();
    navigate("/returns");
  }, { enableOnFormTags: true }, [navigate]);
  
  useHotkeys("ctrl+q", (e) => {
    e.preventDefault();
    navigate("/close-shift");
  }, { enableOnFormTags: true }, [navigate]);
  
  useHotkeys("f11", (e) => {
    e.preventDefault();
    navigate("/pos");
  }, { enableOnFormTags: true }, [navigate]);
  
  useHotkeys("f6>f7", () => navigate("/customers"), { enableOnFormTags: true }, [navigate]);
  
  // يتم عرض مكون Layout فقط إذا كان المستخدم مسجل دخوله (AuthContext)
  if (!user) {
    // هذا لا ينبغي أن يحدث بفضل PrivateRoute، لكنه إجراء وقائي.
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="text-slate-600 dark:text-slate-300 hover:text-blue-500"
          >
            {isSidebarCollapsed ? (
              <FiChevronsRight size={24} />
            ) : (
              <FiChevronsLeft size={24} />
            )}
          </button>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-slate-600 dark:text-slate-300 hover:text-blue-500"
            >
              {theme === "light" ? <FiMoon size={22} /> : <FiSun size={22} />}
            </button>

            {/* Shop Name + User */}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {settings?.store_name || "My Shop"} | {user?.username}
            </span>

            <LanguageSwitcher />

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <FiLogOut />
              <span>{t("sidebar.logout", "Logout")}</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
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
}

// ************ المكون المساعد: InitialRedirect ************
function InitialRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div>Loading session...</div>;
  }
  // إذا لم يكن المستخدم موجوداً، يجب التوجيه لصفحة تسجيل الدخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // التوجيه الافتراضي بناءً على الدور
  // ملاحظة: يتم استخدام 'replace' لمنع التوجيه الأولي من الدخول في تاريخ المتصفح
  return user.role === "cashier" ? (
    <Navigate to="/pos" replace />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

// ************ المكون الرئيسي: App ************
function App() {
  const { i18n } = useTranslation();

  // auto change page direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n, i18n.language]);

  // Data Migration Logic
  useEffect(() => {
    const runMigration = async () => {
      const migrationDone = localStorage.getItem("mysql_products_migrated_v1");
      if (!migrationDone) {
        console.log("Checking for data to migrate...");
        try {
          const localProducts = await db.products.toArray();
          if (localProducts.length > 0) {
            console.log(`Found ${localProducts.length} products to migrate.`);
            // API call migration (اختياري)
            /*
            const response = await fetch(`${API_URL}/api/products/migrate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ products: localProducts }),
            });
            if (response.ok) {
              console.log("Migration successful!");
              localStorage.setItem("mysql_products_migrated_v1", "true");
            } else {
              console.error("Migration API call failed:", await response.text());
            }
            */
            // وضع علامة "تم الترحيل" حتى لو لم نقم باستدعاء API في هذا المثال
             localStorage.setItem("mysql_products_migrated_v1", "true");

          } else {
            console.log("No local products found to migrate.");
            localStorage.setItem("mysql_products_migrated_v1", "true");
          }
        } catch (error) {
          console.error("An error occurred during migration:", error);
        }
      } else {
        console.log("Product migration has already been completed.");
      }
    };
    // تشغيل الترحيل بعد فترة قصيرة
    setTimeout(runMigration, 2000); 
  }, []);

  return (
  
    
      
        <POSProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Layout Route: يتطلب مصادقة (AuthContext) ويحتوي على الشريط الجانبي والرأس */}
            <Route element={<Layout />}>
              <Route path="/" element={<InitialRedirect />} />
              
              {/* جميع المسارات المحمية تتطلب ProtectedRoute للتحقق من الصلاحيات */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute permission="view_dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute permission="manage_inventory">
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute permission="use_pos">
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns"
                element={
                  <ProtectedRoute permission="process_returns">
                    <Returns />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute permission="manage_customers">
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute permission="manage_suppliers">
                    <Suppliers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute permission="manage_purchases">
                    <Purchases />
                  </ProtectedRoute>
                }
              />
<Route
  path="/close-sales"
  element={
    <ProtectedRoute permission="manage_inventory">
      <CloseSales />
    </ProtectedRoute>
  }
/>
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute permission="manage_expenses">
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute permission="view_all_transactions">
                    <AllTransactions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute permission="view_all_reports">
                    <Reports />
                  </ProtectedRoute>
                }

              />
<Route
  path="/reports/sold-products"
  element={
    <ProtectedRoute permission="view_sold_products">
      <SoldProductsReport />
    </ProtectedRoute>
  }
/>


              <Route
                path="/users"
                element={
                  <ProtectedRoute permission="manage_users">
                    <Users />
                  </ProtectedRoute>
                }
              />
<Route path="/inventory/count" element={<InventoryCountPage />} />
<Route path="/inventory/worksheet" element={<InventoryWorksheetPage />} />

              <Route
                path="/search-receipts"
                element={
                  <ProtectedRoute permission="search_receipts">
                    <ReceiptSearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/close-shift"
                element={
                  <ProtectedRoute permission="close_shift">
                    <ClosingShift />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shift-history"
                element={
                  <ProtectedRoute permission="view_shift_history">
                    <ShiftHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute permission="manage_settings">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            
            {/* مسار Catch-all لأي مسار غير موجود - يعيد التوجيه للصفحة الرئيسية */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </POSProvider>
      
    


  );
}

export default App;