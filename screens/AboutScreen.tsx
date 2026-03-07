import React from 'react';
import { InfoIcon } from '../components/icons';

const AboutScreen: React.FC = () => {
  return (
    <div className="p-8 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)'}}>
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-2xl text-center border dark:border-amber-800/50">
        <InfoIcon className="w-20 h-20 mx-auto text-blue-500 dark:text-amber-500 mb-6" />
        
        <h1 className="text-4xl font-bold text-gray-900 dark:text-amber-400 mb-2">
          نظام إدارة المطاعم والكاشير
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
          الإصدار 1.0.0
        </p>

        <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
          هذا النظام هو حل متكامل ومتقدم تم تصميمه لتلبية جميع احتياجات المطاعم والمقاهي الحديثة. 
          يوفر البرنامج واجهة سهلة الاستخدام باللغة العربية لإدارة نقاط البيع، الطلبات، التوصيل، العملاء، والمخزون بكفاءة عالية.
        </p>
        
        <div className="mt-10 border-t pt-6 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                تم التطوير بواسطة
            </h2>
            <p className="text-blue-600 dark:text-amber-500 font-bold text-2xl mt-2">
                فريق التطوير
            </p>
        </div>
      </div>
    </div>
  );
};

export default AboutScreen;