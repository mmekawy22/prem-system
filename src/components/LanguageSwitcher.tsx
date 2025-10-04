import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi'; // استيراد أيقونة الكرة الأرضية

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // اللون الأساسي الذي اعتمدناه في التصميم
  const primaryColorClass = "sky-600";
  
  // هذه اللغة هي اللغة التي سيتم التبديل إليها (العكس للغة الحالية)
  const nextLanguage = i18n.language === 'en' ? 'العربية' : 'English';

  // This function checks the current language and switches to the other one.
  const handleLanguageChange = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    // تصميم الزر كـ "شريحة" (Pill) بلون التمييز (sky-600)
    <button 
      onClick={handleLanguageChange} 
      // تحديث كلاسات Tailwind: تباعد داخلي، حواف دائرية كاملة، ألوان عصرية وشفافية
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full 
        bg-${primaryColorClass} text-white font-medium text-sm
        shadow-md shadow-${primaryColorClass}/30 
        hover:bg-sky-700 transition-all duration-200
      `}
      title={`Switch to ${nextLanguage}`} // تلميح للغة التي سيتم التبديل إليها
    >
        {/* أيقونة الكرة الأرضية */}
        <FiGlobe size={18} />
        {/* عرض اللغة الحالية فقط، أو اللغة التي سيتم التبديل إليها حسب الرغبة */}
        <span>{i18n.language === 'en' ? 'ENG' : 'عربي'}</span>
    </button>
  );
}

export default LanguageSwitcher;