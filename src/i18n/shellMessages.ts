import type { Language } from './LanguageProvider';

const rows: [string, string, string, string][] = [
  ['Learning workspace', 'O‘quv muhiti', 'Oqıw ortası', 'Учебное пространство'],
  ['Main navigation', 'Asosiy navigatsiya', 'Tiykarǵı navigaciya', 'Основная навигация'],
  ['Teacher navigation', 'O‘qituvchi navigatsiyasi', 'Muǵallim navigaciyası', 'Навигация преподавателя'],
  ['Open navigation', 'Menyuni ochish', 'Menyudı ashıw', 'Открыть меню'],
  ['Close navigation', 'Menyuni yopish', 'Menyudı jabıw', 'Закрыть меню'],
  ['Navigation', 'Menyu', 'Menyu', 'Меню'],
  ['Skip to main content', 'Asosiy mazmunga o‘tish', 'Tiykarǵı mazmunǵa ótiw', 'Перейти к основному содержимому'],
  ['Test builder', 'Test tuzish', 'Test dúziw', 'Конструктор тестов'],
  ['{count} saved practice questions', 'Mashq uchun saqlangan savollar: {count}', 'Shınıǵıw ushın saqlanǵan sorawlar: {count}', 'Сохранённых вопросов для практики: {count}'],
  ['{count} sample responses awaiting review', 'Tekshirishni kutayotgan namuna javoblar: {count}', 'Tekseriwdi kútip turǵan úlgi juwaplar: {count}', 'Примеров ответов на проверку: {count}'],
  ['Loading workspace', 'Ish muhiti yuklanmoqda', 'Jumıs ortası júklenbekte', 'Загружается рабочее пространство'],
  ['Loading design reference', 'Dizayn qo‘llanmasi yuklanmoqda', 'Dizayn qollanbası júklenbekte', 'Загружается справочник дизайна'],
  ['Workspace unavailable', 'Ish muhitini ochib bo‘lmadi', 'Jumıs ortasın ashıp bolmadı', 'Рабочее пространство недоступно'],
  ['Reload this page or return to a working destination.', 'Sahifani qayta yuklang yoki boshqa sahifaga qayting.', 'Betti qayta júkleń yamasa basqa betke qaytıń.', 'Перезагрузите страницу или вернитесь в другой раздел.'],
  ['Reload page', 'Sahifani qayta yuklash', 'Betti qayta júklew', 'Перезагрузить страницу'],
  ['Page not found', 'Sahifa topilmadi', 'Bet tabılmadı', 'Страница не найдена'],
  ['Choose a destination from the navigation or use the return link.', 'Menyudan kerakli sahifani tanlang yoki qaytish havolasidan foydalaning.', 'Menyudan kerekli betti tańlań yamasa qaytıw siltemesinen paydalanıń.', 'Выберите раздел в меню или воспользуйтесь ссылкой возврата.'],
  ['Back to overview', 'Umumiy ko‘rinishga qaytish', 'Ulıwma kóriniske qaytıw', 'Вернуться к обзору'],
  ['Exam workspace', 'Test oynasi', 'Test aynası', 'Экран теста'],
  ['Review workspace', 'Javoblar tahlili', 'Juwaplar talqılawı', 'Разбор ответов'],
  ['Local preferences', 'Shu brauzer sozlamalari', 'Usı brauzer sazlamaları', 'Настройки этого браузера'],
  ['{hours} hours {minutes} minutes {seconds} seconds remaining', 'Qolgan vaqt: {hours} soat {minutes} daqiqa {seconds} soniya', 'Qalǵan waqıt: {hours} saat {minutes} minut {seconds} sekund', 'Осталось: {hours} ч {minutes} мин {seconds} с'],
];
export const shellCopy: Record<string, Record<Language, string>> = Object.fromEntries(rows.map(([key, uz, kaa, ru]) => [key, { uz, kaa, ru }]));
