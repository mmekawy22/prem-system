import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../db';
import { FiDollarSign, FiShoppingCart, FiUserCheck } from 'react-icons/fi';

// 1. تحديث اسم الخاصية من color إلى bgColor
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}

// تعديل تصميم البطاقة StatCard ليكون عصري وملون
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor }) => (
  // 2. تطبيق اللون (bgColor)، حواف دائرية أكبر (rounded-2xl)، ظل عصري وناعم، وتأثير حركي
  <div className={`${bgColor} p-6 rounded-2xl shadow-lg shadow-black/10 flex items-center gap-6 transform transition duration-300 hover:scale-[1.02] cursor-pointer`}>
    {/* إزالة div الأيقونة ذات الخلفية الفاتحة وجعل الأيقونة بيضاء */}
    <div className="text-white opacity-90">
      {icon}
    </div>
    <div className="flex-1">
      {/* جعل عنوان البطاقة أبيض مع شفافية بسيطة */}
      <p className="text-sm font-medium text-white opacity-80">{title}</p>
      {/* جعل القيمة أبيض صارخ */}
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayExpenses: 0,
    customersServed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTimestamp = todayStart.getTime();

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayEndTimestamp = todayEnd.getTime();
        
        // Calculate Today's Sales
        const salesTx = await db.transactions
          .where('timestamp').between(todayStartTimestamp, todayEndTimestamp)
          .and(tx => tx.type === 'sale')
          .toArray();
        const totalSales = salesTx.reduce((sum, tx) => sum + (tx.final_total || tx.total), 0);

        // Calculate Today's Expenses
        const expenses = await db.expenses
          .where('timestamp').between(todayStartTimestamp, todayEndTimestamp)
          .toArray();
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Calculate Customers Served
        const uniqueCustomers = new Set(salesTx.map(tx => tx.customer_id).filter(id => id !== undefined));
        
        setStats({
          todaySales: totalSales,
          todayExpenses: totalExpenses,
          customersServed: uniqueCustomers.size
        });

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      {/* العنوان: تحديث الخط واللون ليكون أكثر جاذبية */}
      <h2 className="text-3xl font-extrabold text-sky-700 mb-8">{t('Dashboard')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title={t("Today's Sales")}
          value={`${stats.todaySales.toFixed(2)} EGP`}
          // الأيقونة بيضاء وحجم أكبر
          icon={<FiDollarSign size={36} />} 
          // استخدام لون أخضر عصري (مبيعات)
          bgColor="bg-green-600"
        />
        <StatCard 
          title={t("Today's Expenses")}
          value={`${stats.todayExpenses.toFixed(2)} EGP`}
          // الأيقونة بيضاء وحجم أكبر
          icon={<FiShoppingCart size={36} />} 
          // استخدام لون أحمر وردي جذاب (مصروفات)
          bgColor="bg-rose-600"
        />
        <StatCard 
          title={t("Customers Served Today")}
          value={stats.customersServed.toString()}
          // الأيقونة بيضاء وحجم أكبر
          icon={<FiUserCheck size={36} />} 
          // استخدام لون أزرق سماوي حيوي (عملاء)
          bgColor="bg-sky-600"
        />
      </div>
      {/* يمكنك إضافة مكونات أخرى هنا مثل الرسوم البيانية أو النشاط الأخير */}
    </div>
  );
}

export default Dashboard;