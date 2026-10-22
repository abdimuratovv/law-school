import type { Language } from './LanguageProvider';
const rows: [string, string, string, string][] = [
  [
    "Accessibility",
    "Maxsus imkoniyatlar",
    "Arnawlı múmkinshilikler",
    "Специальные возможности"
  ],
  [
    "Attempt history",
    "Urinishlar tarixi",
    "Urınıslar tariyxı",
    "История попыток"
  ],
  [
    "Attempt history table",
    "Urinishlar tarixi jadvali",
    "Urınıslar tariyxı kestesi",
    "Таблица истории попыток"
  ],
  [
    "Average and best use all final results in the selected mode. Preliminary and sample summaries are excluded.",
    "O‘rtacha va eng yaxshi ko‘rsatkich tanlangan rejimdagi yakuniy natijalardan hisoblanadi. Dastlabki va namuna natijalar kiritilmaydi.",
    "Ortasha hám eń jaqsı kórsetkish tańlanǵan rejimdegi juwmaqlanǵan nátiyjelerden esaplanadı. Dáslepki hám úlgi nátiyjeler qosılmaydı.",
    "Среднее и лучший показатель учитывают все окончательные результаты выбранного режима. Предварительные и примеры исключены."
  ],
  [
    "Back to progress",
    "Natijalar tarixiga qaytish",
    "Nátiyjeler tariyxına qaytıw",
    "К прогрессу"
  ],
  [
    "Back to results",
    "Natijaga qaytish",
    "Nátiyjege qaytıw",
    "К результатам"
  ],
  [
    "Best final score",
    "Eng yaxshi yakuniy natija",
    "Eń jaqsı juwmaqlanǵan nátiyje",
    "Лучший окончательный результат"
  ],
  [
    "Close retry",
    "Mashqni yopish",
    "Shınıǵıwdı jabıw",
    "Закрыть тренировку"
  ],
  [
    "Could not save this preference. The previous setting is unchanged.",
    "Sozlama saqlanmadi. Oldingi qiymat o‘zgarmadi.",
    "Sazlama saqlanbadı. Aldınǵı mánis ózgermedi.",
    "Не удалось сохранить настройку. Прежнее значение сохранено."
  ],
  [
    "Could not sign out. Allow browser storage and try again.",
    "Chiqib bo‘lmadi. Brauzer xotirasiga ruxsat berib qayta urining.",
    "Shıǵıp bolmadı. Brauzer yadına ruqsat berip qayta urınıń.",
    "Не удалось выйти. Разрешите хранение данных и повторите."
  ],
  [
    "Could not update saved questions. Your list is unchanged; try again.",
    "Saqlangan savollar yangilanmadi. Ro‘yxat o‘zgarmadi; qayta urining.",
    "Saqlanǵan sorawlar jańalanbadı. Dizim ózgermedi; qayta urınıń.",
    "Не удалось обновить сохранённые вопросы. Список не изменён; повторите."
  ],
  [
    "Earlier test",
    "Oldingi test",
    "Aldınǵı test",
    "Прежний тест"
  ],
  [
    "Exact dates, modes, scores and grading status for the selected mode.",
    "Tanlangan rejim uchun sana, ball va baholash holati.",
    "Tańlanǵan rejim ushın sáne, ball hám bahalaw jaǵdayı.",
    "Точные даты, режимы, баллы и статус оценивания выбранного режима."
  ],
  [
    "Final result",
    "Yakuniy natija",
    "Juwmaqlanǵan nátiyje",
    "Окончательный результат"
  ],
  [
    "Final score",
    "Yakuniy ball",
    "Juwmaqlanǵan ball",
    "Окончательный балл"
  ],
  [
    "Final score trend",
    "Yakuniy ballar o‘zgarishi",
    "Juwmaqlanǵan ballardıń ózgeriwi",
    "Динамика окончательных баллов"
  ],
  [
    "Final score: {correct} of {total}, {percent} percent",
    "Yakuniy ball: {total} tadan {correct}, {percent} foiz",
    "Juwmaqlanǵan ball: {total} den {correct}, {percent} procent",
    "Окончательный балл: {correct} из {total}, {percent} процентов"
  ],
  [
    "Final scores by date. Equivalent values follow in the attempt history table.",
    "Sana bo‘yicha yakuniy ballar. Aniq qiymatlar quyidagi tarix jadvalida.",
    "Sáne boyınsha juwmaqlanǵan ballar. Anıq mánisler tómendegi tariyx kestesinde.",
    "Окончательные баллы по датам. Точные значения — в таблице истории ниже."
  ],
  [
    "Final-score average",
    "Yakuniy ballar o‘rtachasi",
    "Juwmaqlanǵan ballardıń ortashası",
    "Средний окончательный балл"
  ],
  [
    "Identity",
    "Shaxsiy ma’lumotlar",
    "Jeke maǵlıwmatlar",
    "Личные данные"
  ],
  [
    "Keep learning",
    "O‘rganishni davom ettirish",
    "Úyreniwdi dawam etiw",
    "Продолжить обучение"
  ],
  [
    "Language and appearance",
    "Til va ko‘rinish",
    "Til hám kórinis",
    "Язык и оформление"
  ],
  [
    "Language changed in this tab only. Retry saving before closing.",
    "Til faqat shu oynada o‘zgardi. Yopishdan oldin saqlashni qayta urining.",
    "Til tek usı aynada ózgerdi. Jabıwdan aldın saqlawdı qayta urınıń.",
    "Язык изменён только в этой вкладке. Повторите сохранение до закрытия."
  ],
  [
    "Language saved on this device.",
    "Til shu qurilmada saqlandi.",
    "Til usı qurılmada saqlandı.",
    "Язык сохранён на этом устройстве."
  ],
  [
    "Learning and account",
    "O‘rganish va hisob",
    "Úyreniw hám esap",
    "Обучение и учётная запись"
  ],
  [
    "No attempts in this mode",
    "Bu rejimda urinishlar yo‘q",
    "Bul rejimde urınıslar joq",
    "В этом режиме нет попыток"
  ],
  [
    "No final results in this mode. Preliminary answers still await grading; sample summaries are not personal trends.",
    "Bu rejimda yakuniy natijalar yo‘q. Dastlabki javoblar baholashni kutmoqda; namunalar shaxsiy ko‘rsatkich emas.",
    "Bul rejimde juwmaqlanǵan nátiyjeler joq. Dáslepki juwaplar bahalawdı kútpekte; úlgiler jeke kórsetkish emes.",
    "В этом режиме нет окончательных результатов. Предварительные ответы ждут оценки; примеры не входят в личную динамику."
  ],
  [
    "No model answer is available. This response remains awaiting grading.",
    "Namuna javob yo‘q. Bu javob baholashni kutmoqda.",
    "Úlgi juwap joq. Bul juwap bahalawdı kútpekte.",
    "Образца ответа нет. Ответ остаётся в ожидании оценки."
  ],
  [
    "No questions match this filter.",
    "Bu filtrga mos savollar yo‘q.",
    "Bul filtrge sáykes sorawlar joq.",
    "По этому фильтру нет вопросов."
  ],
  [
    "No saved questions yet",
    "Hozircha saqlangan savollar yo‘q",
    "Ele saqlanǵan sorawlar joq",
    "Пока нет сохранённых вопросов"
  ],
  [
    "Open a result, review a question, then choose Save question for practice.",
    "Natijani oching, savolni ko‘ring va Mashq uchun saqlashni tanlang.",
    "Nátiyjeni ashıń, sorawdı kóriń hám Shınıǵıw ushın saqlawdı tańlań.",
    "Откройте результат, разберите вопрос и выберите сохранение для тренировки."
  ],
  [
    "Open saved questions",
    "Saqlangan savollarni ochish",
    "Saqlanǵan sorawlardı ashıw",
    "Открыть сохранённые вопросы"
  ],
  [
    "Open test details to resume",
    "Davom etish uchun test tafsilotlari",
    "Dawam etiw ushın test maǵlıwmatları",
    "Открыть тест для продолжения"
  ],
  [
    "Open test details to retake",
    "Qayta ishlash uchun test tafsilotlari",
    "Qayta islew ushın test maǵlıwmatları",
    "Открыть тест для повторной попытки"
  ],
  [
    "Opens in a new tab",
    "Yangi oynada ochiladi",
    "Jańa aynada ashıladı",
    "Откроется в новой вкладке"
  ],
  [
    "Preference saved on this device.",
    "Sozlama shu qurilmada saqlandi.",
    "Sazlama usı qurılmada saqlandı.",
    "Настройка сохранена на этом устройстве."
  ],
  [
    "Preferences apply to this browser. Changes save immediately when storage is available.",
    "Sozlamalar shu brauzerga tegishli. Xotira mavjud bo‘lsa, o‘zgarishlar darhol saqlanadi.",
    "Sazlamalar usı brauzerge tiyisli. Yad qoljetimli bolsa, ózgerisler dárhal saqlanadı.",
    "Настройки относятся к этому браузеру и сохраняются сразу, если хранилище доступно."
  ],
  [
    "Preliminary score",
    "Dastlabki ball",
    "Dáslepki ball",
    "Предварительный балл"
  ],
  [
    "Preliminary score: {correct} of {total}, {percent} percent",
    "Dastlabki ball: {total} tadan {correct}, {percent} foiz",
    "Dáslepki ball: {total} den {correct}, {percent} procent",
    "Предварительный балл: {correct} из {total}, {percent} процентов"
  ],
  [
    "Question {id} is unavailable. You can remove this saved entry.",
    "{id} savol mavjud emas. Bu yozuvni o‘chirishingiz mumkin.",
    "{id} soraw joq. Bul jazıwdı óshiriwińiz múmkin.",
    "Вопрос {id} недоступен. Эту запись можно удалить."
  ],
  [
    "Reference",
    "Manba",
    "Derek",
    "Источник"
  ],
  [
    "Reference: {label} (opens in a new tab)",
    "Manba: {label} (yangi oynada ochiladi)",
    "Derek: {label} (jańa aynada ashıladı)",
    "Источник: {label} (откроется в новой вкладке)"
  ],
  [
    "Remove from saved questions",
    "Saqlangan savollardan olib tashlash",
    "Saqlanǵan sorawlardan alıp taslaw",
    "Убрать из сохранённых вопросов"
  ],
  [
    "Reveal example",
    "Namunani ko‘rsatish",
    "Úlgini kórsetiw",
    "Показать образец"
  ],
  [
    "Review an explanation, save a question, then practice it without changing this result.",
    "Izohni ko‘ring, savolni saqlang va shu natijani o‘zgartirmasdan mashq qiling.",
    "Túsindirmesin kóriń, sorawdı saqlań hám usı nátiyjeni ózgertpesten shınıǵıń.",
    "Разберите объяснение, сохраните вопрос и тренируйтесь, не меняя этот результат."
  ],
  [
    "Review navigation",
    "Tahlil bo‘ylab o‘tish",
    "Talqılaw boyınsha ótiw",
    "Навигация по разбору"
  ],
  [
    "Review question {number}",
    "{number}-savol tahlili",
    "{number}-sorawdı talqılaw",
    "Разбор вопроса {number}"
  ],
  [
    "Review written answers",
    "Yozma javoblarni ko‘rish",
    "Jazba juwaplardı kóriw",
    "Разобрать письменные ответы"
  ],
  [
    "Sample result summary",
    "Namuna natija xulosasi",
    "Úlgi nátiyje juwmaǵı",
    "Сводка примера результата"
  ],
  [
    "Sample summary",
    "Namuna xulosa",
    "Úlgi juwmaq",
    "Пример сводки"
  ],
  [
    "Save for practice",
    "Mashq uchun saqlash",
    "Shınıǵıw ushın saqlaw",
    "Сохранение для тренировки"
  ],
  [
    "Save question for practice",
    "Savolni mashq uchun saqlash",
    "Sorawdı shınıǵıw ushın saqlaw",
    "Сохранить вопрос для тренировки"
  ],
  [
    "Saved questions updated on this device.",
    "Saqlangan savollar shu qurilmada yangilandi.",
    "Saqlanǵan sorawlar usı qurılmada jańalandı.",
    "Сохранённые вопросы обновлены на этом устройстве."
  ],
  [
    "Saved tests stay on this device. Any timed test keeps counting down while you are signed out.",
    "Saqlangan testlar shu qurilmada qoladi. Chiqib turganingizda ham vaqtli testlar davom etadi.",
    "Saqlanǵan testler usı qurılmada qaladı. Shıǵıp turǵanıńızda da waqıtlı testler dawam etedi.",
    "Сохранённые тесты останутся на этом устройстве. Таймер продолжит отсчёт после выхода."
  ],
  [
    "Saving a question does not change your grade. Retry practice is not added to test history.",
    "Savolni saqlash bahoni o‘zgartirmaydi. Mashq urinishlari test tarixiga qo‘shilmaydi.",
    "Sorawdı saqlaw bahańızdı ózgertpeydi. Shınıǵıw urınısları test tariyxına qosılmaydı.",
    "Сохранение вопроса не меняет оценку. Тренировка не добавляется в историю тестов."
  ],
  [
    "Score (%) by submission date",
    "Topshirish sanasi bo‘yicha ball (%)",
    "Tapsırıw sánesi boyınsha ball (%)",
    "Баллы (%) по дате сдачи"
  ],
  [
    "Score = correct answers ÷ all questions. Pending answers are not marked incorrect.",
    "Ball = to‘g‘ri javoblar ÷ barcha savollar. Kutilayotgan javoblar xato deb belgilanmaydi.",
    "Ball = durıs juwaplar ÷ barlıq sorawlar. Kútilip atırǵan juwaplar qáte dep belgilenbeydi.",
    "Балл = верные ответы ÷ все вопросы. Ожидающие оценки ответы не считаются ошибочными."
  ],
  [
    "Show all answers",
    "Barcha javoblarni ko‘rsatish",
    "Barlıq juwaplardı kórsetiw",
    "Показать все ответы"
  ],
  [
    "Show all attempts",
    "Barcha urinishlarni ko‘rsatish",
    "Barlıq urınıslardı kórsetiw",
    "Показать все попытки"
  ],
  [
    "Sign out with active work?",
    "Tugallanmagan ish bilan chiqasizmi?",
    "Juwmaqlanbaǵan is penen shıǵasız ba?",
    "Выйти с незавершённой работой?"
  ],
  [
    "Signing out keeps this browser’s results, saved questions and active tests. Timed tests keep counting down.",
    "Chiqishda shu brauzerdagi natijalar, savollar va faol testlar saqlanadi. Vaqtli testlar davom etadi.",
    "Shıǵıwda usı brauzerdegi nátiyjeler, sorawlar hám belsendi testler saqlanadı. Waqıtlı testler dawam etedi.",
    "После выхода результаты, вопросы и активные тесты остаются в браузере. Таймеры продолжают отсчёт."
  ],
  [
    "Some work is unsaved in this tab. Stay signed in and retry saving before closing or reloading.",
    "Bu oynadagi ayrim ishlar saqlanmagan. Yopish yoki qayta yuklashdan oldin hisobda qolib saqlashni qayta urining.",
    "Bul aynadaǵı ayırım isler saqlanbaǵan. Jabıw yamasa qayta júklewden aldın esapta qalıp saqlawdı qayta urınıń.",
    "Часть работы в этой вкладке не сохранена. Останьтесь в системе и повторите сохранение до закрытия или перезагрузки."
  ],
  [
    "Stay signed in",
    "Hisobda qolish",
    "Esapta qalıw",
    "Остаться в системе"
  ],
  [
    "Submission date",
    "Topshirish sanasi",
    "Tapsırıw sánesi",
    "Дата сдачи"
  ],
  [
    "Teacher review is not connected in this preview.",
    "Bu namunada o‘qituvchi tekshiruvi ulanmagan.",
    "Bul úlgide oqıtıwshı tekseriwi jalǵanbaǵan.",
    "Проверка преподавателем в этом примере не подключена."
  ],
  [
    "These are questions you saved for practice, not a list of every incorrect answer.",
    "Bu mashq uchun saqlagan savollaringiz; barcha xato javoblar ro‘yxati emas.",
    "Bul shınıǵıw ushın saqlaǵan sorawlarıńız; barlıq qáte juwaplar dizimi emes.",
    "Здесь вопросы, которые вы сохранили для тренировки, а не все ваши ошибки."
  ],
  [
    "This is a local preview. Results and saved questions belong to this browser, not a private online account.",
    "Bu mahalliy namuna. Natijalar va savollar shaxsiy onlayn hisobga emas, shu brauzerga tegishli.",
    "Bul jergilikli úlgi. Nátiyjeler hám sorawlar jeke onlayn esapqa emes, usı brauzerge tiyisli.",
    "Это локальный пример. Результаты и вопросы относятся к браузеру, а не к личной онлайн-учётной записи."
  ],
  [
    "This retry is not saved as a test attempt. Closing it clears only this practice response.",
    "Bu mashq test urinishi sifatida saqlanmaydi. Yopish faqat shu mashq javobini tozalaydi.",
    "Bul shınıǵıw test urınısı sıpatında saqlanbaydı. Jabıw tek usı shınıǵıw juwabın tazalaydı.",
    "Тренировка не сохраняется как попытка теста. Закрытие очищает только тренировочный ответ."
  ],
  [
    "This sample history has no saved answers to review.",
    "Bu namuna tarixda ko‘rish uchun saqlangan javoblar yo‘q.",
    "Bul úlgi tariyxta kóriw ushın saqlanǵan juwaplar joq.",
    "В этом примере истории нет сохранённых ответов для разбора."
  ],
  [
    "This saved item or its question content is unavailable. Your stored records have not been changed.",
    "Bu yozuv yoki savol mazmuni mavjud emas. Saqlangan ma’lumotlaringiz o‘zgarmadi.",
    "Bul jazıw yamasa soraw mazmunı joq. Saqlanǵan maǵlıwmatlarıńız ózgermedi.",
    "Запись или текст вопроса недоступны. Сохранённые данные не изменены."
  ],
  [
    "Topic counts are preliminary while answers await grading.",
    "Javoblar tekshirilguncha mavzu ko‘rsatkichlari dastlabki hisoblanadi.",
    "Juwaplar tekserilgenshe tema kórsetkishleri dáslepki bolıp esaplanadı.",
    "Пока ответы ждут оценки, показатели по темам предварительные."
  ],
  [
    "Topic counts include every question in this attempt.",
    "Mavzu ko‘rsatkichlari shu urinishdagi barcha savollarni qamrab oladi.",
    "Tema kórsetkishleri usı urınıstaǵı barlıq sorawlardı qamtıydı.",
    "Показатели по темам учитывают все вопросы этой попытки."
  ],
  [
    "Try again",
    "Qayta mashq qilish",
    "Qayta shınıǵıw",
    "Попробовать снова"
  ],
  [
    "Unavailable saved question",
    "Saqlangan savol mavjud emas",
    "Saqlanǵan soraw joq",
    "Сохранённый вопрос недоступен"
  ],
  [
    "Up to 10 most recent final results, ordered by submission date. Exact values are in the table below.",
    "Topshirish sanasi bo‘yicha so‘nggi 10 tagacha yakuniy natija. Aniq qiymatlar quyidagi jadvalda.",
    "Tapsırıw sánesi boyınsha sońǵı 10 ǵa shekem juwmaqlanǵan nátiyje. Anıq mánisler tómendegi kestede.",
    "До 10 последних окончательных результатов по дате сдачи. Точные значения — в таблице ниже."
  ],
  [
    "Use browser zoom to enlarge this interface. Motion follows your system preference; larger exam text is available in Exam options.",
    "Interfeysni brauzer masshtabi orqali kattalashtiring. Harakat tizim sozlamasiga mos; katta test matni Test sozlamalarida.",
    "Interfeysti brauzer masshtabı arqalı úlkeytiń. Háreket sistema sazlamasına sáykes; úlken test teksti Test sazlamalarında.",
    "Увеличивайте интерфейс масштабом браузера. Анимация следует настройке системы; крупный текст теста доступен в его параметрах."
  ],
  [
    "Use solid navigation surfaces instead of translucent glass.",
    "Yarim shaffof oynalar o‘rniga xira navigatsiya yuzalaridan foydalanish.",
    "Yarım móldir aynalar ornına tıǵız navigaciya betlerin qollanıw.",
    "Использовать непрозрачные поверхности навигации вместо стекла."
  ],
  [
    "View attempt history",
    "Urinishlar tarixini ko‘rish",
    "Urınıslar tariyxın kóriw",
    "Посмотреть историю попыток"
  ],
  [
    "Written answers use sample checks. Teacher review is not connected in this preview.",
    "Yozma javoblar namuna qoidalari bilan tekshiriladi. O‘qituvchi tekshiruvi ulanmagan.",
    "Jazba juwaplar úlgi qaǵıydaları menen tekseriledi. Oqıtıwshı tekseriwi jalǵanbaǵan.",
    "Письменные ответы проверяются по образцам. Проверка преподавателем не подключена."
  ],
  [
    "Your history is unchanged. Choose another mode or show all attempts.",
    "Tarixingiz o‘zgarmadi. Boshqa rejimni tanlang yoki barcha urinishlarni ko‘rsating.",
    "Tariyxıńız ózgermedi. Basqa rejimdi tańlań yamasa barlıq urınıslardı kórsetiń.",
    "История не изменена. Выберите другой режим или покажите все попытки."
  ],
  [
    "Your saved test history on this device. Practice retries do not add attempts.",
    "Shu qurilmada saqlangan test tarixi. Qayta mashqlar urinish qo‘shmaydi.",
    "Usı qurılmada saqlanǵan test tariyxı. Qayta shınıǵıwlar urınıs qospaydı.",
    "История тестов на этом устройстве. Тренировки не добавляют попыток."
  ],
  [
    "Your score",
    "Sizning ballingiz",
    "Siziń ballıńız",
    "Ваш балл"
  ],
  [
    "{count} attempts shown",
    "{count} ta urinish ko‘rsatilmoqda",
    "{count} urınıs kórsetilmekte",
    "Показано попыток: {count}"
  ],
  [
    "{count} questions shown",
    "{count} ta savol ko‘rsatilmoqda",
    "{count} soraw kórsetilmekte",
    "Показано вопросов: {count}"
  ],
  [
    "{count} saved questions",
    "{count} ta saqlangan savol",
    "{count} saqlanǵan soraw",
    "Сохранено вопросов: {count}"
  ],
  [
    "{percent} percent",
    "{percent} foiz",
    "{percent} procent",
    "{percent} процентов"
  ],
["No model answer is available for this question.", "Bu savol uchun namuna javob yo‘q.", "Bul soraw ushın úlgi juwap joq.", "Для этого вопроса нет образца ответа."],
["Grading status", "Baholash holati", "Bahalaw jaǵdayı", "Статус оценивания"],
["Action", "Amal", "Ámel", "Действие"]
];
export const learningCopy: Record<string, Record<Language, string>> = Object.fromEntries(rows.map(([key, uz, kaa, ru]) => [key, { uz, kaa, ru }]));
