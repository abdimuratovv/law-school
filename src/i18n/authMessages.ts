import type { Language } from './LanguageProvider';
const rows: [string, string, string, string][] = [
  ['Google sign-in', 'Google orqali kirish', 'Google arqalı kiriw', 'Вход через Google'],
  ['Sign in to continue', 'Davom etish uchun kiring', 'Dawam etiw ushın kiriń', 'Войдите, чтобы продолжить'],
  ['Use your Google account to sign in or register.', 'Kirish yoki ro‘yxatdan o‘tish uchun Google hisobingizdan foydalaning.', 'Kiriw yamasa dizimnen ótiw ushın Google esabıńızdan paydalanıń.', 'Используйте аккаунт Google для входа или регистрации.'],
  ['Continue with Google', 'Google orqali davom etish', 'Google arqalı dawam etiw', 'Продолжить с Google'],
  ['Opening Google...', 'Google ochilmoqda...', 'Google ashılmaqta...', 'Открываем Google...'],
  ['Sign-in was cancelled. You can try again.', 'Kirish bekor qilindi. Qayta urinishingiz mumkin.', 'Kiriw biykar etildi. Qayta urınıp kóriwińiz múmkin.', 'Вход отменён. Можно попробовать снова.'],
  ['Sign-in could not be completed. Please try again.', 'Kirish yakunlanmadi. Qayta urinib ko‘ring.', 'Kiriw tamamlanbadı. Qayta urınıp kóriń.', 'Не удалось завершить вход. Попробуйте ещё раз.'],
  ['Sign-in is temporarily unavailable.', 'Kirish hozircha mavjud emas.', 'Kiriw házirshe múmkin emes.', 'Вход временно недоступен.'],
  ['Try again', 'Qayta urinish', 'Qayta urınıw', 'Попробовать снова'],
  ['This page is only available to teachers.', 'Bu sahifa faqat o‘qituvchilar uchun.', 'Bul bet tek muǵallimler ushın.', 'Эта страница доступна только преподавателям.'],
  ['Open practice is available to registered users. Teachers assign group tests.', 'Ro‘yxatdan o‘tganlar ochiq mashqlarni ishlashi mumkin. Guruh testlarini o‘qituvchi tayinlaydi.', 'Dizimnen ótkenler ashıq shınıǵıwlardı orınlay aladı. Topar testlerin muǵallim belgileydi.', 'Открытая практика доступна зарегистрированным пользователям. Групповые тесты назначает преподаватель.'],
  ['You are signed in with Google. Exam data is still a local preview until server tests are connected.', 'Siz Google orqali kirdingiz. Serverdagi testlar ulanmaguncha test ma’lumotlari mahalliy namuna bo‘lib qoladi.', 'Siz Google arqalı kirdińiz. Serverdegi testler jalǵanǵansha test maǵlıwmatları jergilikli úlgi bolıp qaladı.', 'Вы вошли через Google. До подключения серверных тестов данные экзаменов остаются локальным примером.'],
  ['Signing out revokes this session and clears this account’s local preview work.', 'Chiqish bu sessiyani bekor qiladi va hisobning mahalliy namuna ishlarini tozalaydi.', 'Shıǵıw bul sessiyanı biykar etedi hám esaptıń jergilikli úlgi jumısların tazalaydı.', 'Выход завершает сеанс и удаляет локальную работу этого аккаунта с примерами.'],
  ['Signing out clears this account’s local preview work. Keep working if you want to retain it.', 'Chiqishda hisobning mahalliy namuna ishlari o‘chadi. Ularni saqlash uchun ishlashda davom eting.', 'Shıǵıwda esaptıń jergilikli úlgi jumısları óshiril edi. Olardı saqlaw ushın jumıstı dawam etiń.', 'При выходе локальная работа аккаунта с примерами удаляется. Продолжайте работу, если хотите её сохранить.'],
  ['Could not sign out. Check your connection and try again.', 'Chiqish amalga oshmadi. Internetni tekshirib, qayta urinib ko‘ring.', 'Shıǵıw ámelge aspadı. Internetti tekserip, qayta urınıp kóriń.', 'Не удалось выйти. Проверьте соединение и попробуйте снова.'],
];
export const authCopy: Record<string, Record<Language, string>> = Object.fromEntries(rows.map(([key, uz, kaa, ru]) => [key, { uz, kaa, ru }]));
