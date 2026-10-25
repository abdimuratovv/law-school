import type { Language } from "./LanguageProvider";
export const authoringCopy: Record<string, Record<Language, string>> = {
 "Uzbek questions": {uz:"O‘zbekcha savollar",kaa:"Ózbekshe sorawlar",ru:"Вопросы на узбекском"},
 "Karakalpak questions": {uz:"Qoraqalpoqcha savollar",kaa:"Qaraqalpaqsha sorawlar",ru:"Вопросы на каракалпакском"},
 "Choose the same number of questions for each language. Students choose one language.": {uz:"Har ikki tilda bir xil miqdorda savol tanlang. O‘quvchi testni boshlashda bitta tilni tanlaydi.",kaa:"Hár eki tilde teń sanda soraw tańlań. Oqıwshı bir tildi tańlaydı.",ru:"Выберите одинаковое количество вопросов для каждого языка. Ученик выбирает один язык."},
 "Both languages must have the same question count.": {uz:"Ikki tildagi savollar soni teng bo‘lishi kerak.",kaa:"Eki tildegi sorawlar sanı teń bolıwı kerek.",ru:"Количество вопросов на обоих языках должно совпадать."},
  "Local draft": {
    "uz": "Mahalliy qoralama",
    "kaa": "Jergilikli qaralama",
    "ru": "Локальный черновик"
  },
  "Local draft found": {
    "uz": "Mahalliy qoralama topildi",
    "kaa": "Jergilikli qaralama tabıldı",
    "ru": "Найден локальный черновик"
  },
  "Local drafts do not publish questions or assign tests.": {
    "uz": "Mahalliy qoralamalar savollarni nashr qilmaydi va test tayinlamaydi.",
    "kaa": "Jergilikli qaralamalar sorawlardı járiyalamaydı hám test tayınlamaydı.",
    "ru": "Локальные черновики не публикуют вопросы и не назначают тесты."
  },
  "Draft storage is unavailable or incompatible": {
    "uz": "Qoralama xotirasi mavjud emas yoki mos kelmaydi",
    "kaa": "Qaralama saqlaǵıshı qoljetimsiz yamasa sáykes emes",
    "ru": "Хранилище черновиков недоступно или несовместимо"
  },
  "Another version needs your decision": {
    "uz": "Boshqa versiya bo‘yicha qaror kerak",
    "kaa": "Basqa nusqa boyınsha sheshim kerek",
    "ru": "Нужно выбрать версию черновика"
  },
  "Unable to save. Keep this tab open.": {
    "uz": "Saqlab bo‘lmadi. Bu oynani ochiq tuting.",
    "kaa": "Saqlaw múmkin bolmadı. Bul betti ashıq qaldırıń.",
    "ru": "Не удалось сохранить. Оставьте эту вкладку открытой."
  },
  "Unsaved changes on this device": {
    "uz": "Bu qurilmada saqlanmagan o‘zgarishlar",
    "kaa": "Bul qurılmada saqlanbaǵan ózgerisler",
    "ru": "Есть несохранённые изменения"
  },
  "Draft saved on this device": {
    "uz": "Qoralama bu qurilmada saqlandi",
    "kaa": "Qaralama bul qurılmada saqlandı",
    "ru": "Черновик сохранён на этом устройстве"
  },
  "Resume local draft": {
    "uz": "Mahalliy qoralamani davom ettirish",
    "kaa": "Jergilikli qaralamanı dawam etiw",
    "ru": "Продолжить локальный черновик"
  },
  "Start fresh": {
    "uz": "Yangidan boshlash",
    "kaa": "Jańadan baslaw",
    "ru": "Начать заново"
  },
  "Save local draft": {
    "uz": "Mahalliy qoralamani saqlash",
    "kaa": "Jergilikli qaralamanı saqlaw",
    "ru": "Сохранить локальный черновик"
  },
  "Retry saving": {
    "uz": "Qayta saqlash",
    "kaa": "Qayta saqlaw",
    "ru": "Повторить сохранение"
  },
  "Discard local draft": {
    "uz": "Mahalliy qoralamani o‘chirish",
    "kaa": "Jergilikli qaralamanı óshiriw",
    "ru": "Удалить локальный черновик"
  },
  "Discard this local draft?": {
    "uz": "Bu mahalliy qoralama o‘chirilsinmi?",
    "kaa": "Bul jergilikli qaralama óshirilsin be?",
    "ru": "Удалить этот локальный черновик?"
  },
  "Discard draft": {
    "uz": "Qoralamani o‘chirish",
    "kaa": "Qaralamanı óshiriw",
    "ru": "Удалить черновик"
  },
  "This route returns to its source. Other drafts and student work are kept.": {
    "uz": "Bu sahifa asl holatiga qaytadi. Boshqa qoralamalar va o‘quvchi ishlari saqlanadi.",
    "kaa": "Bul bet dáslepki halatına qaytadı. Basqa qaralamalar hám oqıwshı jumısları saqlanadı.",
    "ru": "Эта страница вернётся к исходному состоянию. Остальные черновики и работы учеников сохранятся."
  },
  "Another tab changed this draft": {
    "uz": "Boshqa oynada qoralama o‘zgartirildi",
    "kaa": "Basqa bette qaralama ózgertildi",
    "ru": "Черновик изменён в другой вкладке"
  },
  "Keep current in memory": {
    "uz": "Joriy nusxani xotirada tutish",
    "kaa": "Házirgi nusqanı yadta saqlaw",
    "ru": "Оставить текущую версию в памяти"
  },
  "Use saved version": {
    "uz": "Saqlangan nusxani ishlatish",
    "kaa": "Saqlanǵan nusqanı qollanıw",
    "ru": "Использовать сохранённую версию"
  },
  "Your current fields remain in memory. Use the saved version or explicitly replace it with these fields.": {
    "uz": "Joriy maydonlar xotirada qoladi. Saqlangan nusxani oling yoki uni shu maydonlar bilan almashtiring.",
    "kaa": "Házirgi maydanlar yadta qaladı. Saqlanǵan nusqanı alıń yamasa onı usı maydanlar menen almastırıń.",
    "ru": "Текущие поля остаются в памяти. Загрузите сохранённую версию или явно замените её текущими полями."
  },
  "Replace saved version with mine": {
    "uz": "Saqlangan nusxani mening nusxam bilan almashtirish",
    "kaa": "Saqlanǵan nusqanı meniń nusqam menen almastırıw",
    "ru": "Заменить сохранённую версию моей"
  },
  "Review versions": {
    "uz": "Versiyalarni ko‘rish",
    "kaa": "Nusqalardı kóriw",
    "ru": "Выбрать версию"
  },
  "Keep editing": {
    "uz": "Tahrirlashni davom ettirish",
    "kaa": "Ózgertiwdi dawam etiw",
    "ru": "Продолжить редактирование"
  },
  "Leave with unsaved changes?": {
    "uz": "Saqlanmagan o‘zgarishlar bilan chiqilsinmi?",
    "kaa": "Saqlanbaǵan ózgerisler menen shıǵılsın ba?",
    "ru": "Уйти с несохранёнными изменениями?"
  },
  "Leave anyway": {
    "uz": "Baribir chiqish",
    "kaa": "Báribir shıǵıw",
    "ru": "Всё равно уйти"
  },
  "Changes have not been saved. Leaving can lose this draft. Keep editing to retry saving.": {
    "uz": "O‘zgarishlar saqlanmagan. Chiqsangiz qoralama yo‘qolishi mumkin. Qayta saqlash uchun tahrirlashni davom ettiring.",
    "kaa": "Ózgerisler saqlanbaǵan. Shıqsańız qaralama joǵalıwı múmkin. Qayta saqlaw ushın ózgertiwdi dawam etiń.",
    "ru": "Изменения не сохранены. При выходе черновик может потеряться. Продолжите редактирование, чтобы повторить сохранение."
  },
  "Question unavailable": {
    "uz": "Savol mavjud emas",
    "kaa": "Soraw qoljetimsiz",
    "ru": "Вопрос недоступен"
  },
  "This question ID has no source content.": {
    "uz": "Bu savol ID uchun asl matn yo‘q.",
    "kaa": "Bul soraw ID ushın dáslepki mazmun joq.",
    "ru": "Для этого ID нет исходного вопроса."
  },
  "Prepare a local draft, then check the student preview.": {
    "uz": "Mahalliy qoralama tayyorlang, keyin o‘quvchi ko‘rinishini tekshiring.",
    "kaa": "Jergilikli qaralama tayarlań, keyin oqıwshı kórinisin tekseriń.",
    "ru": "Подготовьте локальный черновик и проверьте вид для ученика."
  },
  "Question fields": {
    "uz": "Savol maydonlari",
    "kaa": "Soraw maydanları",
    "ru": "Поля вопроса"
  },
  "Check these fields": {
    "uz": "Bu maydonlarni tekshiring",
    "kaa": "Bul maydanlardı tekseriń",
    "ru": "Проверьте эти поля"
  },
  "Question content": {
    "uz": "Savol mazmuni",
    "kaa": "Soraw mazmunı",
    "ru": "Содержание вопроса"
  },
  "Full question text": {
    "uz": "Savolning to‘liq matni",
    "kaa": "Sorawdıń tolıq teksti",
    "ru": "Полный текст вопроса"
  },
  "Matching blocks (optional)": {
    "uz": "Moslashtirish bloklari (ixtiyoriy)",
    "kaa": "Sáykeslendiriw blokları (qálewge qaray)",
    "ru": "Блоки сопоставления (необязательно)"
  },
  "One item per line. Keep its number or letter before the text.": {
    "uz": "Har satrda bir band. Matn oldida uning raqami yoki harfini saqlang.",
    "kaa": "Hár qatarda bir bánt. Tekst aldında onıń sanın yamasa háribin saqlań.",
    "ru": "По одному пункту в строке. Сохраняйте его номер или букву перед текстом."
  },
  "Terms": {
    "uz": "Atamalar",
    "kaa": "Atamalar",
    "ru": "Термины"
  },
  "Definitions": {
    "uz": "Ta’riflar",
    "kaa": "Anıqlamalar",
    "ru": "Определения"
  },
  "Answer key": {
    "uz": "Javob kaliti",
    "kaa": "Juwap gilti",
    "ru": "Ключ ответов"
  },
  "Enter four options and choose one correct answer.": {
    "uz": "To‘rtta variant kiriting va bitta to‘g‘ri javobni tanlang.",
    "kaa": "Tórt variant kiritiń hám bir durıs juwaptı tańlań.",
    "ru": "Введите четыре варианта и выберите один правильный ответ."
  },
  "Grading method": {
    "uz": "Baholash usuli",
    "kaa": "Bahalaw usılı",
    "ru": "Способ проверки"
  },
  "This draft requires teacher review.": {
    "uz": "Bu qoralama o‘qituvchi tekshiruvini talab qiladi.",
    "kaa": "Bul qaralama oqıtıwshı tekseriwın talap etedi.",
    "ru": "Этот черновик требует проверки учителем."
  },
  "The preview lists accepted answers. Live grading rules are unchanged.": {
    "uz": "Ko‘rinishda qabul qilinadigan javoblar beriladi. Amaldagi baholash qoidalari o‘zgarmaydi.",
    "kaa": "Kóriniste qabıl etiletuǵın juwaplar beriledi. Házirgi bahalaw qaǵıydaları ózgermeydi.",
    "ru": "Предпросмотр показывает допустимые ответы. Действующие правила оценивания не меняются."
  },
  "Accepted answer": {
    "uz": "Qabul qilinadigan javob",
    "kaa": "Qabıl etiletuǵın juwap",
    "ru": "Допустимый ответ"
  },
  "Add accepted answer": {
    "uz": "Qabul qilinadigan javob qo‘shish",
    "kaa": "Qabıl etiletuǵın juwap qosıw",
    "ru": "Добавить допустимый ответ"
  },
  "Draft settings": {
    "uz": "Qoralama sozlamalari",
    "kaa": "Qaralama sazlamaları",
    "ru": "Настройки черновика"
  },
  "Points (preview only)": {
    "uz": "Ball (faqat ko‘rinish uchun)",
    "kaa": "Ball (tek kórinis ushın)",
    "ru": "Баллы (только предпросмотр)"
  },
  "Legal basis (optional)": {
    "uz": "Huquqiy asos (ixtiyoriy)",
    "kaa": "Huqıqıy tiykar (qálewge qaray)",
    "ru": "Правовое основание (необязательно)"
  },
  "Legal label": {
    "uz": "Huquqiy manba nomi",
    "kaa": "Huqıqıy derek atı",
    "ru": "Название правового источника"
  },
  "Source link": {
    "uz": "Manba havolasi",
    "kaa": "Derek siltemesi",
    "ru": "Ссылка на источник"
  },
  "Check and preview": {
    "uz": "Tekshirish va ko‘rish",
    "kaa": "Tekseriw hám kóriw",
    "ru": "Проверить и просмотреть"
  },
  "Student preview": {
    "uz": "O‘quvchi ko‘rinishi",
    "kaa": "Oqıwshı kórinisi",
    "ru": "Вид для ученика"
  },
  "Answer key shown for the author. No student response is recorded.": {
    "uz": "Muallif uchun javob kaliti ko‘rsatilgan. O‘quvchi javobi yozilmaydi.",
    "kaa": "Avtor ushın juwap gilti kórsetilgen. Oqıwshı juwabı jazılmaydı.",
    "ru": "Ключ показан автору. Ответ ученика не записывается."
  },
  "Finish preview": {
    "uz": "Ko‘rishni yakunlash",
    "kaa": "Kórip shıǵıwdı juwmaqlaw",
    "ru": "Завершить предпросмотр"
  },
  "Preview complete. Nothing was published or assigned.": {
    "uz": "Ko‘rish tugadi. Hech narsa nashr qilinmadi yoki tayinlanmadi.",
    "kaa": "Kórip shıǵıw tamamlandı. Hesh nárse járiyalanbadı yamasa tayınlanbadı.",
    "ru": "Предпросмотр завершён. Ничего не опубликовано и не назначено."
  },
  "Change question type?": {
    "uz": "Savol turi o‘zgartirilsinmi?",
    "kaa": "Soraw túri ózgertilsin be?",
    "ru": "Изменить тип вопроса?"
  },
  "Change type": {
    "uz": "Turini o‘zgartirish",
    "kaa": "Túrin ózgertiw",
    "ru": "Изменить тип"
  },
  "Changing type clears answer options, matching blocks and accepted answers. The question text and settings remain.": {
    "uz": "Turini o‘zgartirish variantlar, moslashtirish bloklari va qabul qilinadigan javoblarni tozalaydi. Savol matni va sozlamalar qoladi.",
    "kaa": "Túrin ózgertiw variantlardı, sáykeslendiriw blokların hám qabıl etiletuǵın juwaplardı tazalaydı. Soraw teksti hám sazlamalar qaladı.",
    "ru": "Смена типа удалит варианты, блоки сопоставления и допустимые ответы. Текст вопроса и настройки сохранятся."
  },
  "Enter the full question text.": {
    "uz": "Savolning to‘liq matnini kiriting.",
    "kaa": "Sorawdıń tolıq tekstin kiritiń.",
    "ru": "Введите полный текст вопроса."
  },
  "Enter all four answer options.": {
    "uz": "To‘rtta javob variantini kiriting.",
    "kaa": "Tórt juwap variantın kiritiń.",
    "ru": "Заполните все четыре варианта ответа."
  },
  "Select the correct answer.": {
    "uz": "To‘g‘ri javobni tanlang.",
    "kaa": "Durıs juwaptı tańlań.",
    "ru": "Выберите правильный ответ."
  },
  "Add an accepted answer or choose manual grading.": {
    "uz": "Qabul qilinadigan javob qo‘shing yoki qo‘lda baholashni tanlang.",
    "kaa": "Qabıl etiletuǵın juwap qosıń yamasa qol menen bahalawdı tańlań.",
    "ru": "Добавьте допустимый ответ или выберите ручную проверку."
  },
  "Provide a legal label and a valid HTTP or HTTPS link.": {
    "uz": "Huquqiy manba nomi va to‘g‘ri HTTP yoki HTTPS havolasini kiriting.",
    "kaa": "Huqıqıy derek atın hám durıs HTTP yamasa HTTPS siltemesin kiritiń.",
    "ru": "Укажите название источника и корректную ссылку HTTP или HTTPS."
  },
  "Matching questions need both terms and definitions.": {
    "uz": "Moslashtirish savollariga atamalar va ta’riflar kerak.",
    "kaa": "Sáykeslendiriw sorawlarına atamalar hám anıqlamalar kerek.",
    "ru": "Для сопоставления нужны и термины, и определения."
  },
  "{count} sample rows displayed": {
    "uz": "{count} ta namuna satri ko‘rsatilgan",
    "kaa": "{count} úlgi qatar kórsetilgen",
    "ru": "Показано строк примера: {count}"
  },
  "Changes to sample rows last only in this session.": {
    "uz": "Namuna satrlaridagi o‘zgarishlar faqat bu seansda qoladi.",
    "kaa": "Úlgi qatarlardaǵı ózgerisler tek usı seansda qaladı.",
    "ru": "Изменения строк примера действуют только в этом сеансе."
  },
  "Find questions": {
    "uz": "Savollarni topish",
    "kaa": "Sorawlardı tabıw",
    "ru": "Найти вопросы"
  },
  "Search questions": {
    "uz": "Savollarni qidirish",
    "kaa": "Sorawlardı izlew",
    "ru": "Поиск вопросов"
  },
  "Selected sample rows": {
    "uz": "Tanlangan namuna satrlari",
    "kaa": "Tańlanǵan úlgi qatarlar",
    "ru": "Выбранные строки примера"
  },
  "{count} selected": {
    "uz": "{count} ta tanlandi",
    "kaa": "{count} tańlandı",
    "ru": "Выбрано: {count}"
  },
  "Select {id}": {
    "uz": "{id} ni tanlash",
    "kaa": "{id} tańlaw",
    "ru": "Выбрать {id}"
  },
  "Select displayed rows": {
    "uz": "Ko‘rsatilgan satrlarni tanlash",
    "kaa": "Kórsetilgen qatarlardı tańlaw",
    "ru": "Выбрать показанные строки"
  },
  "Hide selected sample rows": {
    "uz": "Tanlangan namuna satrlarini yashirish",
    "kaa": "Tańlanǵan úlgi qatarlardı jasırıw",
    "ru": "Скрыть выбранные строки примера"
  },
  "Sample rows marked for review in this session.": {
    "uz": "Namuna satrlari bu seansda tekshirish uchun belgilandi.",
    "kaa": "Úlgi qatarlar bul seansda tekseriw ushın belgilendi.",
    "ru": "В этом сеансе строки примера отмечены для проверки."
  },
  "No sample rows remain in this session.": {
    "uz": "Bu seansda namuna satrlari qolmadi.",
    "kaa": "Bul seansda úlgi qatarlar qalmadı.",
    "ru": "В этом сеансе не осталось строк примера."
  },
  "Reset sample rows": {
    "uz": "Namuna satrlarini tiklash",
    "kaa": "Úlgi qatarlardı tiklew",
    "ru": "Восстановить строки примера"
  },
  "Sample question rows": {
    "uz": "Namunaviy savol satrlari",
    "kaa": "Úlgi soraw qatarları",
    "ru": "Строки вопросов примера"
  },
  "This sample row has no full question definition.": {
    "uz": "Bu namuna satrida to‘liq savol yo‘q.",
    "kaa": "Bul úlgi qatarda tolıq soraw joq.",
    "ru": "У этой строки примера нет полного определения вопроса."
  },
  "Hide selected sample rows?": {
    "uz": "Tanlangan namuna satrlari yashirilsinmi?",
    "kaa": "Tańlanǵan úlgi qatarlar jasırılsın ba?",
    "ru": "Скрыть выбранные строки примера?"
  },
  "Hide rows": {
    "uz": "Satrlarni yashirish",
    "kaa": "Qatarlardı jasırıw",
    "ru": "Скрыть строки"
  },
  "Only these sample rows disappear from this session. The saved bank is unchanged.": {
    "uz": "Faqat bu namuna satrlari seansdan yashiriladi. Saqlangan bank o‘zgarmaydi.",
    "kaa": "Tek usı úlgi qatarlar seansdan jasırıladı. Saqlanǵan bank ózgermeydi.",
    "ru": "Только эти строки примера скроются в этом сеансе. Сохранённый банк не изменится."
  },
  "Sample rows hidden in this session. Reload restores the sample.": {
    "uz": "Namuna satrlari bu seansda yashirildi. Qayta yuklash namunani tiklaydi.",
    "kaa": "Úlgi qatarlar bul seansda jasırıldı. Qayta júklew úlgini tikleydi.",
    "ru": "Строки примера скрыты в этом сеансе. Перезагрузка восстановит пример."
  },
  "Teacher workspace · sample data": {
    "uz": "O‘qituvchi ish maydoni · namuna ma’lumotlari",
    "kaa": "Oqıtıwshı jumıs ornı · úlgi maǵlıwmatları",
    "ru": "Кабинет учителя · демонстрационные данные"
  },
  "Next action": {
    "uz": "Keyingi amal",
    "kaa": "Keyingi háreket",
    "ru": "Следующее действие"
  },
  "The queue contains demonstration responses, independent of student results.": {
    "uz": "Navbatdagi namuna javoblar o‘quvchi natijalaridan mustaqil.",
    "kaa": "Gezektegi úlgi juwaplar oqıwshı nátiyjelerinen ǵárezsiz.",
    "ru": "Очередь содержит демонстрационные ответы, не связанные с результатами учеников."
  },
  "Review sample responses": {
    "uz": "Namuna javoblarni tekshirish",
    "kaa": "Úlgi juwaplardı tekseriw",
    "ru": "Проверить ответы примера"
  },
  "Prepare content": {
    "uz": "Material tayyorlash",
    "kaa": "Material tayarlaw",
    "ru": "Подготовить материалы"
  },
  "Content readiness": {
    "uz": "Material tayyorligi",
    "kaa": "Material tayarlıǵı",
    "ru": "Готовность материалов"
  },
  "{count} sample bank rows": {
    "uz": "Bankda {count} ta namuna satri",
    "kaa": "Bankta {count} úlgi qatar",
    "ru": "Строк примера в банке: {count}"
  },
  "{count} sample rows need review": {
    "uz": "{count} ta namuna satrini tekshirish kerak",
    "kaa": "{count} úlgi qatardı tekseriw kerek",
    "ru": "Строк примера на проверку: {count}"
  },
  "Review question content": {
    "uz": "Savol mazmunini tekshirish",
    "kaa": "Soraw mazmunın tekseriw",
    "ru": "Проверить содержание вопросов"
  },
  "Prepare your next test": {
    "uz": "Keyingi testingizni tayyorlang",
    "kaa": "Keyingi testińizdi tayarlań",
    "ru": "Подготовьте следующий тест"
  },
  "Build and save a local draft. Finishing a preview does not assign it.": {
    "uz": "Mahalliy qoralama tuzing va saqlang. Ko‘rishni yakunlash testni tayinlamaydi.",
    "kaa": "Jergilikli qaralama dúziń hám saqlań. Kórip shıǵıwdı juwmaqlaw testti tayınlamaydı.",
    "ru": "Создайте и сохраните локальный черновик. Завершение предпросмотра не назначает тест."
  },
  "Preview import flow": {
    "uz": "Import jarayonini ko‘rish",
    "kaa": "Import barısın kóriw",
    "ru": "Посмотреть процесс импорта"
  },
  "Sample assignments": {
    "uz": "Namuna topshiriqlar",
    "kaa": "Úlgi tapsırmalar",
    "ru": "Примеры назначений"
  },
  "Static examples, not current assignments or deadlines.": {
    "uz": "Bular doimiy namunalar. Joriy topshiriqlar yoki muddatlar emas.",
    "kaa": "Bular ózgermeytuǵın úlgiler. Házirgi tapsırmalar yamasa múddetler emes.",
    "ru": "Статические примеры, не текущие задания или сроки."
  },
  "Sample completion": {
    "uz": "Namuna bajarilishi",
    "kaa": "Úlgi orınlanıwı",
    "ru": "Выполнение в примере"
  },
  "Build a local preview from the sample question pool.": {
    "uz": "Namuna savollaridan mahalliy ko‘rinish tuzing.",
    "kaa": "Úlgi sorawlardıń jıynaǵınan jergilikli kórinis dúziń.",
    "ru": "Создайте локальный предпросмотр из набора вопросов примера."
  },
  "Builder steps": {
    "uz": "Test tuzish bosqichlari",
    "kaa": "Test dúziw basqıshları",
    "ru": "Шаги создания теста"
  },
  "Details": {
    "uz": "Tafsilotlar",
    "kaa": "Maǵlıwmatlar",
    "ru": "Параметры"
  },
  "Groups and dates": {
    "uz": "Guruhlar va sanalar",
    "kaa": "Toparlar hám sáneler",
    "ru": "Группы и даты"
  },
  "Test fields": {
    "uz": "Test maydonlari",
    "kaa": "Test maydanları",
    "ru": "Поля теста"
  },
  "Time limit (minutes)": {
    "uz": "Vaqt chegarasi (daqiqa)",
    "kaa": "Waqıt shegi (minut)",
    "ru": "Ограничение времени (минуты)"
  },
  "Automatic sample selection": {
    "uz": "Namunani avtomatik tanlash",
    "kaa": "Úlgini avtomat tańlaw",
    "ru": "Автовыбор из примера"
  },
  "{count} selected: {single} choice, {written} written": {
    "uz": "{count} ta tanlandi: {single} ta variantli, {written} ta yozma",
    "kaa": "{count} tańlandı: {single} variantlı, {written} jazba",
    "ru": "Выбрано {count}: с выбором — {single}, письменных — {written}"
  },
  "Deterministic selection from the displayed fixture, not the full bank.": {
    "uz": "Tanlov butun bankdan emas, ko‘rsatilgan namunadan tartib bo‘yicha olinadi.",
    "kaa": "Tańlaw tolıq banktan emes, kórsetilgen úlgiden tártip boyınsha alınadı.",
    "ru": "Последовательный выбор из показанного примера, а не из полного банка."
  },
  "Selected IDs": {
    "uz": "Tanlangan ID lar",
    "kaa": "Tańlanǵan ID ler",
    "ru": "Выбранные ID"
  },
  "Choose sample groups": {
    "uz": "Namuna guruhlarini tanlang",
    "kaa": "Úlgi toparlardı tańlań",
    "ru": "Выберите группы примера"
  },
  "Times use this device’s local time zone.": {
    "uz": "Vaqtlar bu qurilmaning mahalliy vaqt mintaqasida.",
    "kaa": "Waqıtlar bul qurılmanıń jergilikli waqıt aymaǵında.",
    "ru": "Время указано в часовом поясе этого устройства."
  },
  "Advanced options": {
    "uz": "Qo‘shimcha sozlamalar",
    "kaa": "Qosımsha sazlamalar",
    "ru": "Дополнительные параметры"
  },
  "This is a preview. No test is published or assigned.": {
    "uz": "Bu faqat ko‘rinish. Test nashr qilinmaydi yoki tayinlanmaydi.",
    "kaa": "Bul tek kórinis. Test járiyalanbaydı yamasa tayınlanbaydı.",
    "ru": "Это предпросмотр. Тест не публикуется и не назначается."
  },
  "Enter a test name.": {
    "uz": "Test nomini kiriting.",
    "kaa": "Test atın kiritiń.",
    "ru": "Введите название теста."
  },
  "Time limit must be between 10 and 300 minutes.": {
    "uz": "Vaqt chegarasi 10 dan 300 daqiqagacha bo‘lishi kerak.",
    "kaa": "Waqıt shegi 10 nan 300 minutqa shekem bolıwı kerek.",
    "ru": "Время должно быть от 10 до 300 минут."
  },
  "Select at least one question.": {
    "uz": "Kamida bitta savol tanlang.",
    "kaa": "Keminde bir soraw tańlań.",
    "ru": "Выберите хотя бы один вопрос."
  },
  "The requested count exceeds the sample pool.": {
    "uz": "So‘ralgan son namunadagi savollar sonidan ko‘p.",
    "kaa": "Soralǵan san úlgidegi sorawlar sanınan kóp.",
    "ru": "Запрошенное количество превышает набор примера."
  },
  "Choose at least one sample group.": {
    "uz": "Kamida bitta namuna guruhi tanlang.",
    "kaa": "Keminde bir úlgi topar tańlań.",
    "ru": "Выберите хотя бы одну группу примера."
  },
  "End date and time must be after the start.": {
    "uz": "Tugash sanasi va vaqti boshlanishdan keyin bo‘lishi kerak.",
    "kaa": "Tamamlanıw sánesi hám waqıtı baslanıwdan keyin bolıwı kerek.",
    "ru": "Окончание должно быть позже начала."
  },
  "Preview the import workflow with sample rows.": {
    "uz": "Namuna satrlari bilan import jarayonini ko‘ring.",
    "kaa": "Úlgi qatarlar menen import barısın kóriń.",
    "ru": "Посмотрите процесс импорта на строках примера."
  },
  "Import preview fields": {
    "uz": "Import ko‘rinishi maydonlari",
    "kaa": "Import kórinisi maydanları",
    "ru": "Поля предпросмотра импорта"
  },
  "Selected files are not parsed. Every file shows the same sample rows. Only its name, size and your decisions can be saved locally; file contents are never saved.": {
    "uz": "Tanlangan fayllar tahlil qilinmaydi. Har bir faylda bir xil namuna satrlari ko‘rsatiladi. Faqat nomi, hajmi va qarorlaringiz mahalliy saqlanadi; fayl mazmuni saqlanmaydi.",
    "kaa": "Tańlanǵan fayllar talqılanbaydı. Hár faylda birdey úlgi qatarlar kórsetiledi. Tek atı, kólemi hám sheshimlerińiz jergilikli saqlanadı; fayl mazmunı saqlanbaydı.",
    "ru": "Выбранные файлы не разбираются. Для любого файла показаны одинаковые строки примера. Локально сохраняются только имя, размер и решения; содержимое файла не сохраняется."
  },
  "Excel .csv or .xlsx, up to 5 MB. One question per row.": {
    "uz": "Excel .csv yoki .xlsx, 5 MB gacha. Har satrda bir savol.",
    "kaa": "Excel .csv yamasa .xlsx, 5 MB ǵa shekem. Hár qatarda bir soraw.",
    "ru": "Excel .csv или .xlsx, до 5 МБ. Один вопрос в строке."
  },
  "Use sample": {
    "uz": "Namunani ishlatish",
    "kaa": "Úlgini qollanıw",
    "ru": "Использовать пример"
  },
  "{count} bytes · metadata only": {
    "uz": "{count} bayt · faqat metama’lumot",
    "kaa": "{count} bayt · tek metamaǵlıwmat",
    "ru": "{count} байт · только метаданные"
  },
  "Sample file": {
    "uz": "Namuna fayli",
    "kaa": "Úlgi fayl",
    "ru": "Файл примера"
  },
  "Replace file": {
    "uz": "Faylni almashtirish",
    "kaa": "Fayldı almastırıw",
    "ru": "Заменить файл"
  },
  "{count} sample rows · {errors} errors · {warnings} unresolved warnings": {
    "uz": "{count} ta namuna satri · {errors} ta xato · {warnings} ta hal qilinmagan ogohlantirish",
    "kaa": "{count} úlgi qatar · {errors} qáte · {warnings} sheshilmegen eskertiw",
    "ru": "Строк примера: {count} · ошибок: {errors} · нерешённых предупреждений: {warnings}"
  },
  "Show rows": {
    "uz": "Satrlarni ko‘rsatish",
    "kaa": "Qatarlardı kórsetiw",
    "ru": "Показать строки"
  },
  "Row {number}": {
    "uz": "{number}-satr",
    "kaa": "{number}-qatar",
    "ru": "Строка {number}"
  },
  "Decision saved in draft": {
    "uz": "Qaror qoralamada saqlandi",
    "kaa": "Sheshim qaralamada saqlandı",
    "ru": "Решение включено в черновик"
  },
  "Valid sample row": {
    "uz": "To‘g‘ri namuna satri",
    "kaa": "Durıs úlgi qatar",
    "ru": "Корректная строка примера"
  },
  "A real import would require fixing the source file. This fixture remains an error.": {
    "uz": "Haqiqiy import uchun asl faylni tuzatish kerak. Bu namunada xato qoladi.",
    "kaa": "Haqıyqıy import ushın dáslepki fayldı dúzetiw kerek. Bul úlgide qáte qaladı.",
    "ru": "Для реального импорта нужно исправить исходный файл. В этом примере ошибка остаётся."
  },
  "Undo topic mapping": {
    "uz": "Mavzu moslashini bekor qilish",
    "kaa": "Tema sáykeslestiriwin biykarlaw",
    "ru": "Отменить сопоставление темы"
  },
  "Map to Constitutional law": {
    "uz": "Konstitutsiyaviy huquqqa moslash",
    "kaa": "Konstituciyalıq huqıqqa sáykeslestiriw",
    "ru": "Сопоставить с конституционным правом"
  },
  "Sample validation summary": {
    "uz": "Namuna tekshiruvi xulosasi",
    "kaa": "Úlgi tekseriwi juwmaǵı",
    "ru": "Сводка проверки примера"
  },
  "{count} eligible sample rows; {errors} error rows remain.": {
    "uz": "{count} ta yaroqli namuna satri; {errors} ta xatoli satr qolmoqda.",
    "kaa": "{count} jaramlı úlgi qatar; {errors} qáteli qatar qalmaqta.",
    "ru": "Пригодных строк примера: {count}; строк с ошибками: {errors}."
  },
  "The file is not ready for a real import. Finishing only completes this demonstration.": {
    "uz": "Fayl haqiqiy importga tayyor emas. Yakunlash faqat namoyishni tugatadi.",
    "kaa": "Fayl haqıyqıy importqa tayar emes. Juwmaqlaw tek kórsetiwdi tamamlaydı.",
    "ru": "Файл не готов к реальному импорту. Завершение заканчивает только демонстрацию."
  },
  "Topic mapping": {
    "uz": "Mavzularni moslash",
    "kaa": "Temalardı sáykeslestiriw",
    "ru": "Сопоставление темы"
  },
  "Not mapped": {
    "uz": "Moslashtirilmagan",
    "kaa": "Sáykeslestirilmegen",
    "ru": "Не сопоставлено"
  },
  "Preview complete. No questions were added to the bank.": {
    "uz": "Ko‘rish tugadi. Bankka savol qo‘shilmadi.",
    "kaa": "Kórip shıǵıw tamamlandı. Bankqa soraw qosılmadı.",
    "ru": "Предпросмотр завершён. В банк не добавлено ни одного вопроса."
  },
  "Duplicate row 7": {
    "uz": "7-satr takrori",
    "kaa": "7-qatar tákirarı",
    "ru": "Дубликат в строке 7"
  },
  "Keep both in this preview": {
    "uz": "Bu ko‘rinishda ikkalasini saqlash",
    "kaa": "Bul kóriniste ekewin de saqlaw",
    "ru": "Оставить оба в предпросмотре"
  },
  "Review sample errors and decisions": {
    "uz": "Namuna xatolari va qarorlarni ko‘rish",
    "kaa": "Úlgi qáteleri hám sheshimlerdi kóriw",
    "ru": "Посмотреть ошибки и решения примера"
  },
  "Replace the selected file?": {
    "uz": "Tanlangan fayl almashtirilsinmi?",
    "kaa": "Tańlanǵan fayl almastırılsın ba?",
    "ru": "Заменить выбранный файл?"
  },
  "This clears this preview’s filename, topic mapping and duplicate decision. File contents are never stored.": {
    "uz": "Bu ko‘rinishdagi fayl nomi, mavzu moslashi va takror bo‘yicha qarorni tozalaydi. Fayl mazmuni saqlanmaydi.",
    "kaa": "Bul kórinistegi fayl atın, tema sáykeslestiriwin hám tákirar boyınsha sheshimdi tazalaydı. Fayl mazmunı saqlanbaydı.",
    "ru": "Это сбросит имя файла, сопоставление темы и решение о дубликате. Содержимое файла не сохраняется."
  },
  "Choose an .csv or .xlsx file up to 5 MB.": {
    "uz": "5 MB gacha .csv yoki .xlsx fayl tanlang.",
    "kaa": "5 MB ǵa shekem .csv yamasa .xlsx fayl tańlań.",
    "ru": "Выберите файл .csv или .xlsx размером до 5 МБ."
  },
  "Option B references an item missing from the question.": {
    "uz": "B varianti savolda yo‘q bandga ishora qiladi.",
    "kaa": "B variantı sorawda joq bántke silteydi.",
    "ru": "Вариант B ссылается на отсутствующий пункт вопроса."
  },
  "Possible duplicate of Q5. Choose whether to skip or keep row 7.": {
    "uz": "Q5 ning ehtimoliy takrori. 7-satrni o‘tkazib yuborish yoki saqlashni tanlang.",
    "kaa": "Q5 tiń múmkin tákirarı. 7-qatardı ótkerip jiberiw yamasa saqlawdı tańlań.",
    "ru": "Возможный дубликат Q5. Решите, пропустить или оставить строку 7."
  },
  "Correct answer is empty.": {
    "uz": "To‘g‘ri javob bo‘sh.",
    "kaa": "Durıs juwap bos.",
    "ru": "Правильный ответ не указан."
  },
  "Unknown topic. Map this sample row to Constitutional law.": {
    "uz": "Noma’lum mavzu. Bu namuna satrini konstitutsiyaviy huquqqa moslang.",
    "kaa": "Belgisiz tema. Bul úlgi qatardı konstituciyalıq huqıqqa sáykeslestiriń.",
    "ru": "Неизвестная тема. Сопоставьте эту строку с конституционным правом."
  },
  "Written question has no accepted answers.": {
    "uz": "Yozma savolda qabul qilinadigan javoblar yo‘q.",
    "kaa": "Jazba sorawda qabıl etiletuǵın juwaplar joq.",
    "ru": "У письменного вопроса нет допустимых ответов."
  },
  "Constitutional law · Practice set 3": {
    "uz": "Konstitutsiyaviy huquq · 3-mashq",
    "kaa": "Konstituciyalıq huqıq · 3-shınıǵıw",
    "ru": "Конституционное право · Практика 3"
  },
  "Criminal law · Practice set 2": {
    "uz": "Jinoyat huquqi · 2-mashq",
    "kaa": "Jınayat huqıqı · 2-shınıǵıw",
    "ru": "Уголовное право · Практика 2"
  },
  "Mock exam No. 8": {
    "uz": "8-sinov imtihoni",
    "kaa": "8-sınaq imtixanı",
    "ru": "Пробный экзамен № 8"
  },
  "Errors": {
    "uz": "Xatolar",
    "kaa": "Qáteler",
    "ru": "Ошибки"
  },
  "Warnings": {
    "uz": "Ogohlantirishlar",
    "kaa": "Eskertiwler",
    "ru": "Предупреждения"
  },
  "Manual grading": {
    "uz": "Qo‘lda baholash",
    "kaa": "Qol menen bahalaw",
    "ru": "Ручная проверка"
  },
  "None": {
    "uz": "Yo‘q",
    "kaa": "Joq",
    "ru": "Нет"
  },
  "Off": {
    "uz": "O‘chiq",
    "kaa": "Óshik",
    "ru": "Выключено"
  },
  "On": {
    "uz": "Yoniq",
    "kaa": "Janıq",
    "ru": "Включено"
  },
  "Option": {
    "uz": "Variant",
    "kaa": "Variant",
    "ru": "Вариант"
  },
  "Reset filters": {
    "uz": "Filtrlarni tozalash",
    "kaa": "Filtrlerdi tazalaw",
    "ru": "Сбросить фильтры"
  },
  "Skip row 7": {
    "uz": "7-satrni o‘tkazib yuborish",
    "kaa": "7-qatardı ótkerip jiberiw",
    "ru": "Пропустить строку 7"
  },
  "single or written": {
    "uz": "single yoki written",
    "kaa": "single yamasa written",
    "ru": "single или written"
  },
  "One of your topic names": {
    "uz": "Mavzularingizdan birining nomi",
    "kaa": "Temalarıńızdan biriniń atı",
    "ru": "Название одной из ваших тем"
  },
  "easy · medium · hard": {
    "uz": "easy · medium · hard (oson · o‘rtacha · qiyin)",
    "kaa": "easy · medium · hard (ańsat · ortasha · qıyın)",
    "ru": "easy · medium · hard (лёгкий · средний · сложный)"
  },
  "Full text; use line breaks for 1–7, a)–g), I/II": {
    "uz": "To‘liq matn; 1–7, a)–g), I/II uchun yangi satr ishlating",
    "kaa": "Tolıq tekst; 1–7, a)–g), I/II ushın jańa qatar qollanıń",
    "ru": "Полный текст; переносы строк для 1–7, a)–g), I/II"
  },
  "Options (single choice)": {
    "uz": "Variantlar (bitta javobli)",
    "kaa": "Variantlar (bir juwaplı)",
    "ru": "Варианты (один ответ)"
  },
  "A, B, C or D": {
    "uz": "A, B, C yoki D",
    "kaa": "A, B, C yamasa D",
    "ru": "A, B, C или D"
  },
  "Written answers, separated by |": {
    "uz": "Yozma javoblar, | bilan ajratiladi",
    "kaa": "Jazba juwaplar, | menen ajıratıladı",
    "ru": "Письменные ответы через |"
  },
  "Reset search": {
    "uz": "Qidiruvni tozalash",
    "kaa": "Izlewdi tazalaw",
    "ru": "Сбросить поиск"
  },
  "Decision included in draft": {
    "uz": "Qaror qoralamaga kiritildi",
    "kaa": "Sheshim qaralamaǵa kiritildi",
    "ru": "Решение включено в черновик"
  }
};
