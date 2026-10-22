import type { Language } from "./LanguageProvider";
export const reviewCopy: Record<string,Record<Language,string>> = {
  "Session-only sample grading": {
    "uz": "Faqat seans uchun namuna baholash",
    "kaa": "Tek seans ushın úlgi bahalaw",
    "ru": "Оценивание примера в этом сеансе"
  },
  "{pending} awaiting review · {done} applied sample grades": {
    "uz": "{pending} ta tekshiruv kutmoqda · {done} ta namuna bahosi qo‘llandi",
    "kaa": "{pending} tekseriwdi kútip tur · {done} úlgi bahası qollanıldı",
    "ru": "Ожидают проверки: {pending} · применено оценок примера: {done}"
  },
  "{done} of {total} sample responses graded": {
    "uz": "{total} ta namuna javobdan {done} tasi baholandi",
    "kaa": "{total} úlgi juwaptan {done} bahalandı",
    "ru": "Оценено ответов примера: {done} из {total}"
  },
  "Awaiting sample review": {
    "uz": "Namuna tekshiruvi kutilmoqda",
    "kaa": "Úlgi tekseriwi kútilmekte",
    "ru": "Ожидает проверки примера"
  },
  "Sample grade applied. Student results were not changed.": {
    "uz": "Namuna bahosi qo‘llandi. O‘quvchi natijalari o‘zgarmadi.",
    "kaa": "Úlgi bahası qollanıldı. Oqıwshı nátiyjeleri ózgermedi.",
    "ru": "Оценка примера применена. Результаты учеников не изменены."
  },
  "Last sample grade and note restored.": {
    "uz": "Oxirgi namuna bahosi va izohi tiklandi.",
    "kaa": "Sońǵı úlgi bahası hám eskertpesi tiklendi.",
    "ru": "Восстановлены предыдущие оценка и заметка примера."
  },
  "Sample queue complete": {
    "uz": "Namuna navbati tugadi",
    "kaa": "Úlgi gezegi tamamlandı",
    "ru": "Очередь примера завершена"
  },
  "All sample responses have an applied grade. Student results remain independent.": {
    "uz": "Barcha namuna javoblariga baho qo‘llandi. O‘quvchi natijalari mustaqil qoladi.",
    "kaa": "Barlıq úlgi juwaplarǵa baha qollanıldı. Oqıwshı nátiyjeleri ǵárezsiz qaladı.",
    "ru": "Все ответы примера оценены. Результаты учеников остаются независимыми."
  },
  "No response available": {
    "uz": "Javob mavjud emas",
    "kaa": "Juwap qoljetimsiz",
    "ru": "Нет доступного ответа"
  },
  "Choose an available sample response or return to the overview.": {
    "uz": "Mavjud namuna javobini tanlang yoki umumiy ko‘rinishga qayting.",
    "kaa": "Qoljetimli úlgi juwaptı tańlań yamasa ulıwma kóriniske qaytıń.",
    "ru": "Выберите доступный ответ примера или вернитесь к обзору."
  },
  "Sample response queue": {
    "uz": "Namuna javoblar navbati",
    "kaa": "Úlgi juwaplar gezegi",
    "ru": "Очередь ответов примера"
  },
  "Response {number}": {
    "uz": "{number}-javob",
    "kaa": "{number}-juwap",
    "ru": "Ответ {number}"
  },
  "Hide student identifiers": {
    "uz": "O‘quvchi identifikatorlarini yashirish",
    "kaa": "Oqıwshı identifikatorların jasırıw",
    "ru": "Скрыть идентификаторы учеников"
  },
  "Student identity hidden": {
    "uz": "O‘quvchi shaxsi yashirilgan",
    "kaa": "Oqıwshı shaxsı jasırılǵan",
    "ru": "Данные ученика скрыты"
  },
  "Sample student": {
    "uz": "Namuna o‘quvchi",
    "kaa": "Úlgi oqıwshı",
    "ru": "Ученик примера"
  },
  "Student answer": {
    "uz": "O‘quvchi javobi",
    "kaa": "Oqıwshı juwabı",
    "ru": "Ответ ученика"
  },
  "Applied state": {
    "uz": "Qo‘llangan holat",
    "kaa": "Qollanǵan halat",
    "ru": "Применённое состояние"
  },
  "Model and rubric": {
    "uz": "Namuna va baholash mezonlari",
    "kaa": "Úlgi hám bahalaw ólshemleri",
    "ru": "Эталон и критерии"
  },
  "No accepted model is set. Review the meaning using the rubric; an empty model does not imply an incorrect response.": {
    "uz": "Qabul qilinadigan namuna belgilanmagan. Ma’noni mezonlar bo‘yicha tekshiring; bo‘sh namuna javob noto‘g‘ri degani emas.",
    "kaa": "Qabıl etiletuǵın úlgi belgilenbegen. Mánisti ólshemler boyınsha tekseriń; bos úlgi juwap nadurıs degeni emes.",
    "ru": "Допустимый эталон не задан. Оцените смысл по критериям; отсутствие эталона не означает неверный ответ."
  },
  "The answer expresses the required concept.": {
    "uz": "Javob kerakli tushunchani ifodalaydi.",
    "kaa": "Juwap kerekli túsinikti bildiredi.",
    "ru": "Ответ выражает нужное понятие."
  },
  "The core idea is present but incomplete.": {
    "uz": "Asosiy fikr bor, lekin to‘liq emas.",
    "kaa": "Tiykarǵı pikir bar, biraq tolıq emes.",
    "ru": "Основная мысль есть, но раскрыта не полностью."
  },
  "The required concept is absent or contradicted.": {
    "uz": "Kerakli tushuncha yo‘q yoki unga zid javob berilgan.",
    "kaa": "Kerekli túsinik joq yamasa oǵan qarsı juwap berilgen.",
    "ru": "Нужное понятие отсутствует или ответ ему противоречит."
  },
  "Draft grade and note": {
    "uz": "Qoralama baho va izoh",
    "kaa": "Qaralama baha hám eskertpe",
    "ru": "Черновик оценки и заметки"
  },
  "Unapplied changes. Apply or discard before leaving.": {
    "uz": "Qo‘llanmagan o‘zgarishlar bor. Chiqishdan oldin qo‘llang yoki bekor qiling.",
    "kaa": "Qollanılmaǵan ózgerisler bar. Shıǵıwdan aldın qollań yamasa biykarlań.",
    "ru": "Есть неприменённые изменения. Примените или отмените их перед выходом."
  },
  "No unapplied changes.": {
    "uz": "Qo‘llanmagan o‘zgarish yo‘q.",
    "kaa": "Qollanılmaǵan ózgeris joq.",
    "ru": "Неприменённых изменений нет."
  },
  "Choose a draft grade": {
    "uz": "Qoralama bahoni tanlang",
    "kaa": "Qaralama bahanı tańlań",
    "ru": "Выберите черновую оценку"
  },
  "Local review note (optional)": {
    "uz": "Mahalliy tekshiruv izohi (ixtiyoriy)",
    "kaa": "Jergilikli tekseriw eskertpesi (qálewge qaray)",
    "ru": "Локальная заметка (необязательно)"
  },
  "This note is part of the sample grade, not a message to a student.": {
    "uz": "Bu izoh namuna bahosiga tegishli; o‘quvchiga yuborilmaydi.",
    "kaa": "Bul eskertpe úlgi bahasına tiyisli; oqıwshıǵa jiberilmeydi.",
    "ru": "Эта заметка относится к оценке примера и не отправляется ученику."
  },
  "Apply sample grade": {
    "uz": "Namuna bahosini qo‘llash",
    "kaa": "Úlgi bahasın qollanıw",
    "ru": "Применить оценку примера"
  },
  "Discard unapplied changes": {
    "uz": "Qo‘llanmagan o‘zgarishlarni bekor qilish",
    "kaa": "Qollanılmaǵan ózgerislerdi biykarlaw",
    "ru": "Отменить неприменённые изменения"
  },
  "Unapplied changes discarded.": {
    "uz": "Qo‘llanmagan o‘zgarishlar bekor qilindi.",
    "kaa": "Qollanılmaǵan ózgerisler biykarlandı.",
    "ru": "Неприменённые изменения отменены."
  },
  "Undo last applied sample grade": {
    "uz": "Oxirgi namuna bahosini qaytarish",
    "kaa": "Sońǵı úlgi bahasın qaytarıw",
    "ru": "Отменить последнее применение оценки"
  },
  "Skip to next unfinished": {
    "uz": "Keyingi tugallanmagan javobga o‘tish",
    "kaa": "Keyingi tamamlanbaǵan juwapqa ótiw",
    "ru": "К следующему непроверенному ответу"
  },
  "Keyboard shortcuts": {
    "uz": "Klaviatura yorliqlari",
    "kaa": "Klaviatura qısqa jolları",
    "ru": "Сочетания клавиш"
  },
  "1 / 2 / 3 choose a draft grade; J / K move; S skips; C focuses the note. Shortcuts pause while typing or in dialogs.": {
    "uz": "1 / 2 / 3 qoralama bahoni tanlaydi; J / K o‘tkazadi; S keyingisiga o‘tadi; C izohga o‘tadi. Yozishda va dialoglarda yorliqlar ishlamaydi.",
    "kaa": "1 / 2 / 3 qaralama bahanı tańlaydı; J / K ótkeredi; S keyingisine ótedi; C eskertpege ótedi. Jazıwda hám dialoglarda qısqa jollar islemeydi.",
    "ru": "1 / 2 / 3 выбирают оценку; J / K переключают ответы; S пропускает; C переводит фокус в заметку. При вводе и в диалогах сочетания приостановлены."
  },
  "Discard unapplied review changes?": {
    "uz": "Qo‘llanmagan tekshiruv o‘zgarishlari bekor qilinsinmi?",
    "kaa": "Qollanılmaǵan tekseriw ózgerisleri biykarlansın ba?",
    "ru": "Отменить неприменённые изменения проверки?"
  },
  "Discard and continue": {
    "uz": "Bekor qilish va davom etish",
    "kaa": "Biykarlaw hám dawam etiw",
    "ru": "Отменить и продолжить"
  },
  "The draft grade and note have not been applied. Continuing discards these edits only.": {
    "uz": "Qoralama baho va izoh qo‘llanmagan. Davom etish faqat shu tahrirlarni bekor qiladi.",
    "kaa": "Qaralama baha hám eskertpe qollanılmaǵan. Dawam etiw tek usı ózgerislerdi biykarlaydı.",
    "ru": "Черновик оценки и заметки не применён. Продолжение отменит только эти изменения."
  },
  "Leave with unapplied review changes?": {
    "uz": "Qo‘llanmagan tekshiruv o‘zgarishlari bilan chiqilsinmi?",
    "kaa": "Qollanılmaǵan tekseriw ózgerisleri menen shıǵılsın ba?",
    "ru": "Уйти с неприменёнными изменениями проверки?"
  },
  "Illustrative student records. These are not the current learner’s local attempts.": {
    "uz": "Namunaviy o‘quvchi yozuvlari. Ular joriy o‘quvchining mahalliy urinishlari emas.",
    "kaa": "Úlgi oqıwshı jazıwları. Olar házirgi oqıwshınıń jergilikli urınıwları emes.",
    "ru": "Демонстрационные записи учеников. Это не локальные попытки текущего ученика."
  },
  "Find a sample student": {
    "uz": "Namuna o‘quvchini topish",
    "kaa": "Úlgi oqıwshını tabıw",
    "ru": "Найти ученика примера"
  },
  "Search name or group": {
    "uz": "Ism yoki guruh bo‘yicha qidirish",
    "kaa": "At yamasa topar boyınsha izlew",
    "ru": "Поиск по имени или группе"
  },
  "{count} sample students displayed": {
    "uz": "{count} ta namuna o‘quvchi ko‘rsatilgan",
    "kaa": "{count} úlgi oqıwshı kórsetilgen",
    "ru": "Показано учеников примера: {count}"
  },
  "Sample students": {
    "uz": "Namuna o‘quvchilar",
    "kaa": "Úlgi oqıwshılar",
    "ru": "Ученики примера"
  },
  "Final sample average": {
    "uz": "Yakuniy namuna o‘rtachasi",
    "kaa": "Juwmaqlanǵan úlgi ortashası",
    "ru": "Среднее итоговых примеров"
  },
  "{count} sample responses": {
    "uz": "{count} ta namuna javob",
    "kaa": "{count} úlgi juwap",
    "ru": "Ответов примера: {count}"
  },
  "Open details": {
    "uz": "Tafsilotlarni ochish",
    "kaa": "Maǵlıwmatlardı ashıw",
    "ru": "Открыть сведения"
  },
  "No students match these filters.": {
    "uz": "Filtrlarga mos o‘quvchi topilmadi.",
    "kaa": "Filtrlerge sáykes oqıwshı tabılmadı.",
    "ru": "По этим фильтрам учеников нет."
  },
  "No sample students available.": {
    "uz": "Namuna o‘quvchilar mavjud emas.",
    "kaa": "Úlgi oqıwshılar qoljetimsiz.",
    "ru": "Нет доступных учеников примера."
  },
  "Sample profile": {
    "uz": "Namuna profil",
    "kaa": "Úlgi profil",
    "ru": "Профиль примера"
  },
  "Sample attempts": {
    "uz": "Namuna urinishlar",
    "kaa": "Úlgi urınıwlar",
    "ru": "Попытки примера"
  },
  "Average across final sample attempts": {
    "uz": "Yakuniy namuna urinishlari o‘rtachasi",
    "kaa": "Juwmaqlanǵan úlgi urınıwlarınıń ortashası",
    "ru": "Среднее по итоговым попыткам примера"
  },
  "Responses awaiting grading": {
    "uz": "Baholashni kutayotgan javoblar",
    "kaa": "Bahalawdı kútip turǵan juwaplar",
    "ru": "Ответы, ожидающие оценки"
  },
  "Pending attempts are preliminary and excluded from the final-score average and trend.": {
    "uz": "Kutilayotgan urinishlar dastlabki hisoblanadi va yakuniy ball o‘rtachasi hamda trendga kiritilmaydi.",
    "kaa": "Kútilip atırǵan urınıwlar dáslepki esaplanadı hám juwmaq balı ortashasına hám trendke kiritilmeydi.",
    "ru": "Попытки с ожидающими оценками предварительные и исключены из среднего итогового балла и тренда."
  },
  "Final sample score trend": {
    "uz": "Yakuniy namuna ballari trendi",
    "kaa": "Juwmaq úlgi balları trendi",
    "ru": "Тренд итоговых баллов примера"
  },
  "Sample attempt date": {
    "uz": "Namuna urinish sanasi",
    "kaa": "Úlgi urınıw sánesi",
    "ru": "Дата попытки примера"
  },
  "Final score (%)": {
    "uz": "Yakuniy ball (%)",
    "kaa": "Juwmaq balı (%)",
    "ru": "Итоговый балл (%)"
  },
  "Final sample topics": {
    "uz": "Yakuniy namuna mavzulari",
    "kaa": "Juwmaq úlgi temaları",
    "ru": "Темы итоговых примеров"
  },
  "{correct} of {total} correct": {
    "uz": "{total} tadan {correct} tasi to‘g‘ri",
    "kaa": "{total} den {correct} durıs",
    "ru": "Верно: {correct} из {total}"
  },
  "Sample attempt history": {
    "uz": "Namuna urinishlar tarixi",
    "kaa": "Úlgi urınıwlar tariyxı",
    "ru": "История попыток примера"
  },
  "Preliminary · {count} awaiting grading": {
    "uz": "Dastlabki · {count} ta baholash kutilmoqda",
    "kaa": "Dáslepki · {count} bahalaw kútilmekte",
    "ru": "Предварительно · ожидают оценки: {count}"
  },
  "Final sample result": {
    "uz": "Yakuniy namuna natijasi",
    "kaa": "Juwmaq úlgi nátiyjesi",
    "ru": "Итоговый результат примера"
  },
  "These demonstration attempts have no result links. They are not matched to local learner history.": {
    "uz": "Bu namuna urinishlarida natija havolalari yo‘q. Ular mahalliy o‘quvchi tarixi bilan bog‘lanmagan.",
    "kaa": "Bul úlgi urınıwlarda nátiyje siltemeleri joq. Olar jergilikli oqıwshı tariyxı menen baylanıspaǵan.",
    "ru": "У этих демонстрационных попыток нет ссылок на результаты. Они не связаны с локальной историей ученика."
  },
  "Assignment preview": {
    "uz": "Topshiriq ko‘rinishi",
    "kaa": "Tapsırma kórinisi",
    "ru": "Предпросмотр назначения"
  },
  "Review suitable practice in the test builder. Opening a preview does not assign work to this sample student.": {
    "uz": "Mos mashqlarni test tuzuvchida ko‘ring. Ko‘rinishni ochish bu namuna o‘quvchiga ish tayinlamaydi.",
    "kaa": "Sáykes shınıǵıwlardı test dúziwshide kóriń. Kórinisti ashıw bul úlgi oqıwshıǵa jumıs tayınlamaydı.",
    "ru": "Посмотрите подходящую практику в конструкторе. Открытие предпросмотра не назначает работу этому ученику примера."
  },
  "Student unavailable in these filters": {
    "uz": "Bu filtrlarda o‘quvchi mavjud emas",
    "kaa": "Bul filtrlerde oqıwshı qoljetimsiz",
    "ru": "Ученик недоступен с этими фильтрами"
  },
  "Choose a sample student": {
    "uz": "Namuna o‘quvchini tanlang",
    "kaa": "Úlgi oqıwshını tańlań",
    "ru": "Выберите ученика примера"
  },
  "Open details from the displayed list. Filters never keep another student’s profile on screen.": {
    "uz": "Ko‘rsatilgan ro‘yxatdan tafsilotlarni oching. Filtrlar ekranda boshqa o‘quvchining profilini qoldirmaydi.",
    "kaa": "Kórsetilgen dizimnen maǵlıwmatlardı ashıń. Filtrler ekranda basqa oqıwshınıń profilin qaldırmaydı.",
    "ru": "Откройте сведения из показанного списка. При фильтрации на экране не остаётся профиль другого ученика."
  },
  "Check the sample key": {
    "uz": "Namuna kalitini tekshiring",
    "kaa": "Úlgi giltin tekseriń",
    "ru": "Проверьте ключ примера"
  },
  "The strongest sample group preferred B over sample key A. Check the key against the source.": {
    "uz": "Eng kuchli namuna guruhi A namuna kalitidan ko‘ra B ni tanladi. Kalitni manba bilan tekshiring.",
    "kaa": "Eń kúshli úlgi toparı A úlgi giltinen kóre B ni tańladı. Giltin derek penen tekseriń.",
    "ru": "Сильнейшая группа примера предпочла B ключу A. Сверьте ключ с источником."
  },
  "Possible ambiguity": {
    "uz": "Ehtimoliy noaniqlik",
    "kaa": "Múmkin bolǵan anıqsızlıq",
    "ru": "Возможная неоднозначность"
  },
  "B and C were chosen at similar rates in the sample. Check whether both options could be defended.": {
    "uz": "Namunada B va C deyarli bir xil ulushda tanlandi. Ikkala variant ham asosli bo‘lishi mumkinligini tekshiring.",
    "kaa": "Úlgide B hám C derlik birdey úleste tańlandı. Eki varianttıń da tiykarı bolıwı múmkinligin tekseriń.",
    "ru": "В примере B и C выбирали почти одинаково часто. Проверьте, можно ли обосновать оба варианта."
  },
  "Reported wording issue": {
    "uz": "Matn bo‘yicha xabar berilgan",
    "kaa": "Tekst boyınsha xabar berilgen",
    "ru": "Сообщение о формулировке"
  },
  "Sample reports suggest unclear wording. Review the written prompt and grading criteria.": {
    "uz": "Namuna xabarlari matn noaniqligini ko‘rsatmoqda. Yozma savol va baholash mezonlarini tekshiring.",
    "kaa": "Úlgi xabarları teksttiń anıq emesligin kórsetedi. Jazba soraw hám bahalaw ólshemlerin tekseriń.",
    "ru": "Сообщения примера указывают на неясную формулировку. Проверьте письменный вопрос и критерии оценки."
  },
  "Low challenge in sample": {
    "uz": "Namunada qiyinlik past",
    "kaa": "Úlgide qıyınlıq tómen",
    "ru": "Низкая сложность в примере"
  },
  "Most sample responses were correct. Check whether the question challenges the intended group.": {
    "uz": "Namuna javoblarining ko‘pi to‘g‘ri. Savol maqsadli guruhga yetarli qiyinchilik berishini tekshiring.",
    "kaa": "Úlgi juwaplarınıń kóbi durıs. Soraw maqsetli toparǵa jeterli qıyınlıq beretuǵının tekseriń.",
    "ru": "Большинство ответов примера верные. Проверьте, достаточно ли сложен вопрос для нужной группы."
  },
  "Unused sample option": {
    "uz": "Namunada tanlanmagan variant",
    "kaa": "Úlgide tańlanbaǵan variant",
    "ru": "Невыбранный вариант примера"
  },
  "No sample responses selected D. Check whether that option is plausible.": {
    "uz": "Namunada hech kim D ni tanlamagan. Bu variant ishonarli ekanini tekshiring.",
    "kaa": "Úlgide hesh kim D ni tańlamaǵan. Bul varianttıń isenimli ekenin tekseriń.",
    "ru": "В примере никто не выбрал D. Проверьте правдоподобность этого варианта."
  },
  "No sample issue flagged": {
    "uz": "Namunada muammo belgilanmagan",
    "kaa": "Úlgide másele belgilenbegen",
    "ru": "В примере проблема не отмечена"
  },
  "No issue is flagged in this sample. Check the source before reuse.": {
    "uz": "Bu namunada muammo belgilanmagan. Qayta ishlatishdan oldin manbani tekshiring.",
    "kaa": "Bul úlgide másele belgilenbegen. Qayta qollanıwdan aldın derekti tekseriń.",
    "ru": "В этом примере проблема не отмечена. Проверьте источник перед повторным использованием."
  },
  "{count} sample question rows · {issues} unreviewed issues": {
    "uz": "{count} ta namuna savol satri · {issues} ta tekshirilmagan muammo",
    "kaa": "{count} úlgi soraw qatarı · {issues} tekserilmegen másele",
    "ru": "Строк вопросов примера: {count} · непроверенных проблем: {issues}"
  },
  "Sample analytics, not live learner data": {
    "uz": "Namuna tahlili, jonli o‘quvchi ma’lumotlari emas",
    "kaa": "Úlgi talqılawı, házirgi oqıwshı maǵlıwmatları emes",
    "ru": "Аналитика примера, не текущие данные учеников"
  },
  "These figures are fixtures and do not recompute from current question definitions. Reviewed markers reset when you leave or reload.": {
    "uz": "Bu raqamlar namuna bo‘lib, joriy savollardan qayta hisoblanmaydi. Tekshirilgan belgilar sahifadan chiqqanda yoki qayta yuklanganda tozalanadi.",
    "kaa": "Bul sanlar úlgi bolıp, házirgi sorawlardan qayta esaplanbaydı. Tekserilgen belgiler betten shıqqanda yamasa qayta júklengende tazalanadı.",
    "ru": "Это фиксированные примеры, не пересчитываемые по текущим вопросам. Отметки проверки сбрасываются при выходе со страницы или перезагрузке."
  },
  "Investigate questions": {
    "uz": "Savollarni o‘rganish",
    "kaa": "Sorawlardı úyreniw",
    "ru": "Исследовать вопросы"
  },
  "Search question, topic or issue": {
    "uz": "Savol, mavzu yoki muammoni qidirish",
    "kaa": "Soraw, tema yamasa máseleni izlew",
    "ru": "Поиск вопроса, темы или проблемы"
  },
  "Issue scope": {
    "uz": "Muammolar doirasi",
    "kaa": "Máseleler sheńberi",
    "ru": "Область проблем"
  },
  "All sample rows": {
    "uz": "Barcha namuna satrlari",
    "kaa": "Barlıq úlgi qatarlar",
    "ru": "Все строки примера"
  },
  "Unreviewed issues": {
    "uz": "Tekshirilmagan muammolar",
    "kaa": "Tekserilmegen máseleler",
    "ru": "Непроверенные проблемы"
  },
  "Reviewed markers": {
    "uz": "Tekshirilgan belgilar",
    "kaa": "Tekserilgen belgiler",
    "ru": "Отметки проверки"
  },
  "Sample question analytics": {
    "uz": "Namuna savollar tahlili",
    "kaa": "Úlgi sorawlar talqılawı",
    "ru": "Аналитика вопросов примера"
  },
  "Sample correct (%)": {
    "uz": "Namunada to‘g‘ri (%)",
    "kaa": "Úlgide durıs (%)",
    "ru": "Верно в примере (%)"
  },
  "Issue": {
    "uz": "Muammo",
    "kaa": "Másele",
    "ru": "Проблема"
  },
  "Inspect": {
    "uz": "Ko‘rib chiqish",
    "kaa": "Kórip shıǵıw",
    "ru": "Исследовать"
  },
  "Reviewed in this view": {
    "uz": "Bu ko‘rinishda tekshirilgan",
    "kaa": "Bul kóriniste tekserilgen",
    "ru": "Проверено в этом просмотре"
  },
  "No sample analytics available.": {
    "uz": "Namuna tahlili mavjud emas.",
    "kaa": "Úlgi talqılawı qoljetimsiz.",
    "ru": "Нет доступной аналитики примера."
  },
  "No unreviewed issues in this sample.": {
    "uz": "Bu namunada tekshirilmagan muammo yo‘q.",
    "kaa": "Bul úlgide tekserilmegen másele joq.",
    "ru": "В этом примере нет непроверенных проблем."
  },
  "No analytics match these filters.": {
    "uz": "Filtrlarga mos tahlil topilmadi.",
    "kaa": "Filtrlerge sáykes talqılaw tabılmadı.",
    "ru": "По этим фильтрам аналитики нет."
  },
  "Question unavailable. Open the bank.": {
    "uz": "Savol mavjud emas. Bankni oching.",
    "kaa": "Soraw qoljetimsiz. Banktı ashıń.",
    "ru": "Вопрос недоступен. Откройте банк."
  },
  "Clear reviewed marker": {
    "uz": "Tekshirilgan belgini tozalash",
    "kaa": "Tekserilgen belgini tazalaw",
    "ru": "Снять отметку проверки"
  },
  "Mark reviewed in this view": {
    "uz": "Bu ko‘rinishda tekshirilgan deb belgilash",
    "kaa": "Bul kóriniste tekserilgen dep belgilew",
    "ru": "Отметить проверенным в этом просмотре"
  },
  "Sample review marker cleared. No grades or answer keys changed.": {
    "uz": "Namuna tekshiruv belgisi tozalandi. Baholar va javob kalitlari o‘zgarmadi.",
    "kaa": "Úlgi tekseriw belgisi tazalandı. Bahalar hám juwap giltleri ózgermedi.",
    "ru": "Отметка проверки примера снята. Оценки и ключи ответов не менялись."
  },
  "Sample row marked reviewed in this view. No grades or answer keys changed.": {
    "uz": "Namuna satri bu ko‘rinishda tekshirilgan deb belgilandi. Baholar va javob kalitlari o‘zgarmadi.",
    "kaa": "Úlgi qatar bul kóriniste tekserilgen dep belgilendi. Bahalar hám juwap giltleri ózgermedi.",
    "ru": "Строка примера отмечена проверенной в этом просмотре. Оценки и ключи не менялись."
  },
  "Regrading is unavailable because these sample analytics are not linked to learner attempts.": {
    "uz": "Bu namuna tahlili o‘quvchi urinishlariga bog‘lanmagani uchun qayta baholash mavjud emas.",
    "kaa": "Bul úlgi talqılawı oqıwshı urınıwlarına baylanıspaǵanı ushın qayta bahalaw qoljetimsiz.",
    "ru": "Пересчёт оценок недоступен: эта аналитика примера не связана с попытками учеников."
  },
  "The source question is written. This legacy A–D distribution is not applicable to its grading.": {
    "uz": "Manbadagi savol yozma. Eski A–D taqsimoti uni baholashga tegishli emas.",
    "kaa": "Derektegi soraw jazba. Eski A–D bólistiriliwi onı bahalawǵa tiyisli emes.",
    "ru": "Исходный вопрос письменный. Прежнее распределение A–D неприменимо к его оценке."
  },
  "Sample option distribution": {
    "uz": "Namuna variantlar taqsimoti",
    "kaa": "Úlgi variantlar bólistiriliwi",
    "ru": "Распределение вариантов примера"
  },
  "Sample shares: A {a}%, B {b}%, C {c}%, D {d}%. Sample key {key}.": {
    "uz": "Namuna ulushlari: A {a}%, B {b}%, C {c}%, D {d}%. Namuna kaliti {key}.",
    "kaa": "Úlgi úlesleri: A {a}%, B {b}%, C {c}%, D {d}%. Úlgi gilti {key}.",
    "ru": "Доли примера: A {a}%, B {b}%, C {c}%, D {d}%. Ключ примера {key}."
  },
  "Sample key": {
    "uz": "Namuna kaliti",
    "kaa": "Úlgi gilti",
    "ru": "Ключ примера"
  },
  "Share of sample responses (%) · 0–100 scale": {
    "uz": "Namuna javoblar ulushi (%) · 0–100 shkala",
    "kaa": "Úlgi juwaplar úlesi (%) · 0–100 shkala",
    "ru": "Доля ответов примера (%) · шкала 0–100"
  },
  "The sample key differs from the current source key. Inspect the question before drawing conclusions.": {
    "uz": "Namuna kaliti joriy manba kalitidan farq qiladi. Xulosa chiqarishdan oldin savolni tekshiring.",
    "kaa": "Úlgi gilti házirgi derek giltinen parıq qıladı. Juwmaq shıǵarıwdan aldın sorawdı tekseriń.",
    "ru": "Ключ примера отличается от текущего исходного ключа. Проверьте вопрос перед выводами."
  },
  "Legacy sample values (not applicable)": {
    "uz": "Eski namuna qiymatlari (tegishli emas)",
    "kaa": "Eski úlgi mánisleri (tiyisli emes)",
    "ru": "Прежние значения примера (неприменимы)"
  },
  "Distribution data table": {
    "uz": "Taqsimot ma’lumotlari jadvali",
    "kaa": "Bólistiriliw maǵlıwmatları kestesi",
    "ru": "Таблица распределения"
  },
  "Sample share (%)": {
    "uz": "Namuna ulushi (%)",
    "kaa": "Úlgi úlesi (%)",
    "ru": "Доля примера (%)"
  },
  "Strongest sample group (%)": {
    "uz": "Eng kuchli namuna guruhi (%)",
    "kaa": "Eń kúshli úlgi toparı (%)",
    "ru": "Сильнейшая группа примера (%)"
  },
  "Strongest group means the top 27% in this illustrative test. Shares are percentages, not respondent counts.": {
    "uz": "Eng kuchli guruh bu namuna testdagi yuqori 27% ni bildiradi. Ulushlar javob beruvchilar soni emas, foizlarda.",
    "kaa": "Eń kúshli topar bul úlgi testtegi joqarǵı 27% ti bildiredi. Úlesler juwap beriwshiler sanı emes, procentlerde.",
    "ru": "Сильнейшая группа — верхние 27% в этом примере теста. Доли указаны в процентах, а не в числе отвечавших."
  },
  "Technical sample indicators": {
    "uz": "Namunaning texnik ko‘rsatkichlari",
    "kaa": "Úlginiń texnikalıq kórsetkishleri",
    "ru": "Технические показатели примера"
  },
  "Discrimination indicator": {
    "uz": "Ajratish ko‘rsatkichi",
    "kaa": "Ajıratıw kórsetkishi",
    "ru": "Показатель различения"
  },
  "A negative indicator means the stronger sample group selected the sample key less often. It suggests review; it does not prove a key error.": {
    "uz": "Manfiy ko‘rsatkich kuchliroq namuna guruhi kalitni kamroq tanlaganini bildiradi. Bu tekshirishga asos, lekin kalit xatosining isboti emas.",
    "kaa": "Teris kórsetkish kúshlirek úlgi toparı giltti siyrek tańlaǵanın bildiredi. Bul tekseriwge tiykar, biraq gilt qátesiniń dálili emes.",
    "ru": "Отрицательное значение означает, что сильнейшая группа реже выбирала ключ примера. Это повод для проверки, а не доказательство ошибки ключа."
  },
  "Question unavailable in this view": {
    "uz": "Bu ko‘rinishda savol mavjud emas",
    "kaa": "Bul kóriniste soraw qoljetimsiz",
    "ru": "Вопрос недоступен в этом просмотре"
  },
  "Choose a question to inspect": {
    "uz": "Ko‘rib chiqish uchun savol tanlang",
    "kaa": "Kórip shıǵıw ushın soraw tańlań",
    "ru": "Выберите вопрос для исследования"
  },
  "Select a displayed row or reset filters. No substitute question is opened silently.": {
    "uz": "Ko‘rsatilgan satrni tanlang yoki filtrlarni tozalang. O‘rniga boshqa savol o‘z-o‘zidan ochilmaydi.",
    "kaa": "Kórsetilgen qatardı tańlań yamasa filtrlerdi tazalań. Ornına basqa soraw óz-ózinen ashılmaydı.",
    "ru": "Выберите показанную строку или сбросьте фильтры. Другой вопрос не открывается вместо выбранного автоматически."
  },
  "All groups": {
    "uz": "Barcha guruhlar",
    "kaa": "Barlıq toparlar",
    "ru": "Все группы"
  },
  "Close details": {
    "uz": "Tafsilotlarni yopish",
    "kaa": "Maǵlıwmatlardı jabıw",
    "ru": "Закрыть сведения"
  },
  "No": {
    "uz": "Yo‘q",
    "kaa": "Joq",
    "ru": "Нет"
  },
  "Yes": {
    "uz": "Ha",
    "kaa": "Awa",
    "ru": "Да"
  },
  "Not available": {
    "uz": "Mavjud emas",
    "kaa": "Qoljetimsiz",
    "ru": "Недоступно"
  },
  "Mock exam No. 7": {
    "uz": "7-sinov imtihoni",
    "kaa": "7-sınaq imtixanı",
    "ru": "Пробный экзамен № 7"
  },
  "1 point": {
    "uz": "1 ball",
    "kaa": "1 ball",
    "ru": "1 балл"
  },
  "0.5 point": {
    "uz": "0,5 ball",
    "kaa": "0,5 ball",
    "ru": "0,5 балла"
  },
  "0 points": {
    "uz": "0 ball",
    "kaa": "0 ball",
    "ru": "0 баллов"
  },
  "Show response queue": {
    "uz": "Javoblar navbatini ko‘rsatish",
    "kaa": "Juwaplar gezegin kórsetiw",
    "ru": "Показать очередь ответов"
  },
  "Applied sample grades and notes stay while this teacher workspace is open. Leaving it or reloading resets them; student results never change.": {
    "uz": "Namuna baholari va izohlar o‘qituvchi ish maydoni ochiq turganda qoladi. Undan chiqish yoki qayta yuklash ularni tozalaydi; o‘quvchi natijalari o‘zgarmaydi.",
    "kaa": "Úlgi bahaları hám eskertpeler oqıtıwshı jumıs ornı ashıq turǵanda qaladı. Onnan shıǵıw yamasa qayta júklew olardı tazalaydı; oqıwshı nátiyjeleri ózgermeydi.",
    "ru": "Оценки и заметки примера остаются, пока открыт кабинет учителя. Выход из кабинета или перезагрузка сбрасывает их; результаты учеников не меняются."
  },
  "The draft grade and note have not been applied. Leaving discards these edits. Applied grades remain only while the teacher workspace stays open.": {
    "uz": "Qoralama baho va izoh qo‘llanmagan. Chiqish shu tahrirlarni bekor qiladi. Qo‘llangan baholar faqat o‘qituvchi ish maydoni ochiq turganda qoladi.",
    "kaa": "Qaralama baha hám eskertpe qollanılmaǵan. Shıǵıw usı ózgerislerdi biykarlaydı. Qollanǵan bahalar tek oqıtıwshı jumıs ornı ashıq turǵanda qaladı.",
    "ru": "Черновик оценки и заметки не применён. Выход отменит эти изменения. Применённые оценки останутся только пока открыт кабинет учителя."
  }
};
