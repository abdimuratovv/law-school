# Javob saqlash va fon vazifasi optimallashtirildi

Bu hujjat [oldingi yuklama hisobotidan](2026-10-25-hisobot.md) keyingi o‘zgarishlarni tavsiflaydi. Oldingi 14,78 million o‘qish/soat va 6 soat 15 daqiqa navbat hisoblari avvalgi kodga tegishli.

## Javob saqlash

Frontend yangi `POST /api/v1/attempts/:id/save-changes` yo‘lidan foydalanadi:

- Faqat o‘zgargan javoblar yuboriladi. O‘chirish `deletedAnswerIds` orqali aniq ko‘rsatiladi; yuborilmagan javoblar saqlanadi.
- Variant va savol identifikatorlari server boshlashda yaratgan immutable `question_order` orqali tekshiriladi. Odatiy autosave `question_versions` jadvalini o‘qimaydi, savol matnini parse qilmaydi va baholamaydi.
- Server `id`, `state`, `revision`, `savedAt`, `serverNow` maydonlaridan iborat ixcham tasdiq qaytaradi. Savollar, javob kalitlari va barcha javoblar qayta yuborilmaydi.
- Faol urinishning oddiy saqlanishi 4 ta D1 binding chaqiruvi va 1 ta satr yozuvini talab qiladi.
- Frontend so‘rov bilan birga to‘liq yuborish paytidagi snapshotni IndexedDB’da saqlaydi. Saqlash davomida yangi yozilgan javoblar dirty bo‘lib qoladi va keyingi so‘rovda yuboriladi.
- Tarmoq uzilsa, aynan o‘sha operation ID va patch qayta yuboriladi. Server yangiroq revisionni yoki tugagan urinishni tasdiqlasa, frontend to‘liq server versiyasini qayta oladi. Boshqa tabning javoblari ustidan yashirincha yozilmaydi.

Sessiya, CSRF, foydalanuvchi holati, urinish egasi, savol/variantga tegishlilik, tekshirilgan javoblarning qulfi, revision va SQL deadline nazorati saqlandi. Tekshirish va topshirish to‘liq snapshotdan foydalanadi; mavjud `/save` endpointi oldingi frontend va IndexedDB’dagi eski pending so‘rovlar uchun avvalgidek to‘liq javob qaytaradi. Yangi DB migratsiyasi talab qilinmaydi.

## Fon vazifasi

Oldingi cheklangan variant 15 daqiqada 8 ta urinishni qayta ishlardi. Endi lokal va staging/production shablonlaridagi cron **har daqiqaga** o‘zgartirildi; bir ishga tushishda **25 tagacha** muddati o‘tgan yoki submitted urinish olinadi.

Urinishlar bir marta o‘qiladi, umumiy savollar bitta invocation ichida qayta ishlatiladi va natija bilan report bir D1 batch ichida yoziladi. Har bir conditional UPDATE urinish holati, revision va kerak bo‘lsa SQL deadline’ni tekshiradi. Uning ortidan kelgan report faqat shu UPDATE muvaffaqiyatli bo‘lganda yoziladi. Shu orada boshqa so‘rov urinishni yakunlasa yoki yangi review yozsa, uning natijasi ustidan yozilmaydi. Batchgacha uzilish bo‘lsa, urinish keyingi safar yana qayta ishlanishi mumkin.

Eng yomon holatda 25 ta turli savollar to‘plami bo‘lsa: sweep **27**, autentifikatsiya tozalashi **1**, tarixiy report backfill **11** — jami **39 D1 binding chaqiruvi**. Bu [Free invocation uchun 50 ta chaqiruv chegarasiga](https://developers.cloudflare.com/d1/platform/limits/) sig‘adi; batch bitta chaqiruv hisoblanadi. Bir xil savollar to‘plamida chaqiruvlar bundan kam bo‘ladi.

Faqat shu 200 ta urinish navbatda bo‘lsa va barcha ishga tushishlar muvaffaqiyatli bajarilsa, ularni 8 ta cron ishga tushishi qayta ishlaydi. Har daqiqalik jadvalda bu **taxminan 8 daqiqa**, oldingi 6 soat 15 daqiqadan ancha qisqa. Bu hosted muhit uchun vaqt kafolati emas: yangi navbatlar, CPU cheklovi va muvaffaqiyatsiz ishga tushishlar vaqtni uzaytiradi. Foydalanuvchi o‘z natijasini ochganda mavjud lazy-finalization cronni kutmasdan ishlaydi. Tarixiy report backfill 2 yozuvdan ishlashda davom etadi.

## Tekshiruvlar

- `npm test`: **180 test**, 17 fayl, hammasi o‘tdi.
- `npm run build`: frontend, server va testlar TypeScript tekshiruvlari hamda production build o‘tdi.
- `npm run build:worker`: Worker dry-run o‘tdi, upload bajarilmadi.
- `npm run verify:exam-bundle`: brauzer bundle’ida maxfiy test kalitlari topilmadi.
- `python -X utf8 scripts/verify-exam-ui.py`: haqiqiy lokal Worker/D1 bilan **14 brauzer tekshiruvi** o‘tdi. Ixcham javob, reload, offline/reconnect, yo‘qolgan tasdiqni qayta yuborish, boshqa qurilma revisioni, ikki tab, tekshirish, topshirish va natijalar qamrab olindi. Test akkaunti hozirgi profil onboarding talabiga moslashtirildi.
- Fon regression testi 200 ta muddati o‘tgan urinishni 8 ishga tushishda yakunladi va har biriga aynan bitta to‘g‘ri report yaratdi. Alohida test 25 ta turli savollar to‘plami va backfill bilan umumiy budjetni tekshiradi.
- Deadline’dan keyingi patch rad etilib, faqat oxirgi tasdiqlangan javoblar baholanishi tekshirildi.

## 100/200 foydalanuvchilik qayta sinov

`npm run test:load -- autosave-background` haqiqiy frontend ishlatadigan patch yaratish va tasdiqni qabul qilish yordamchi funksiyalari bilan bajarildi. Alohida foydalanuvchilar haqiqiy sessiya/CSRF orqali 100 savolli testni boshladi, 4 marta javob saqladi, takroriy saqlash, reconnect va takroriy submit bajardi. Har foydalanuvchi uchun 11 ta so‘rov. Savollar tarkibi avvalgidek: 80 ta variantli va 20 ta qisqa yozma savol.

| Parallel foydalanuvchi | So‘rovlar | Xato | Oldingi saqlash p95 | Yangi saqlash p95 | Yangi topshirish p95 |
| --- | --- | --- | --- | --- | --- |
| 100 | 1 100 | 0 | 2,864 s | 1,198 s | 3,367 s |
| 200 | 2 200 | 0 | 5,914 s | 2,405 s | 6,822 s |

Taqqoslash oldingi hisobotdagi `results/optimized.json` bilan; yangi xom ma’lumotlar [results/autosave-background.json](results/autosave-background.json) ichida. Alohida profillarning umumiy bajarilish vaqti 100 foydalanuvchida 27,483 → 17,337 s, 200 foydalanuvchida 56,101 → 35,208 s bo‘ldi. Bular bittadan lokal yugurish, hosted sig‘im yoki statistik kafolat emas. Maksimal yangi so‘rov vaqti 6,831 s; profil ichida 15 s client timeout chegarasidan o‘tgan so‘rov qayd etilmadi.

| Baza/tarmoq xarajati | Oldingi variant | Yangi variant |
| --- | --- | --- |
| Bitta autosave D1 chaqiruvlari | 7 | 4 |
| Bitta autosave o‘qigan satrlar | 308 | 6 (**98,1% kamayish**) |
| Bitta autosave yozgan satrlar | 1 | 1 |
| Autosave javobining o‘rtacha hajmi | 19 478,75 bayt | 125 bayt (**99,4% kamayish**) |
| 200 kishilik butun profil o‘qigan satrlar | 617 600 | 315 600 (**48,9% kamayish**) |
| 200 kishilik butun profil yozgan satrlar | 5 400 | 5 400 |
| 200 kishilik butun profil javob hajmi | 39,16 MB | 19,84 MB |

Fixture yaratish/migratsiyalar ushbu sarf hisobiga kirmaydi. Eski `/save` bilan ochiq qolgan frontend tablari uchun yangi ixcham transport xarajati amal qilmaydi.

**Yangilangan bir soatlik yuqori yuklama taxmini:** 200 foydalanuvchi har 15 soniyada dirty javob yuborsa, 48 000 autosave × 6 = **288 000 o‘qilgan satr**. Oldingi hisob 14,78 million edi. Faqat autosave o‘qishlari endi D1 Free kunlik 5 million limitidan past. Biroq 48 000 yozuv va 48 000 Worker so‘rovi sarflanadi; shunday uzluksiz yuklama taxminan ikki soat davom etsa, 100 000/kun yozuv yoki Worker so‘rov budjetiga yaqinlashadi. Boshlash, topshirish, login va boshqa trafik ham shu hisobga qo‘shiladi. Demak, bu optimallashtirish Free tarifni cheksiz qilmaydi. [D1 kvotalari](https://developers.cloudflare.com/d1/platform/pricing/), [Workers limitlari](https://developers.cloudflare.com/workers/platform/limits/).

## Deploy va amaliy chegaralar

Bu o‘zgarishlar ishchi katalogda tayyor. Live Worker yoki remote D1 o‘zgartirilmadi. Har daqiqalik cron saytga deploy qilingandan keyin amal qiladi. Oddiy frontend/Worker deployi yetarli; yangi jadval yoki migratsiya yo‘q. Ishlatiladigan alohida staging/production konfiguratsiyasi ilgari ko‘chirib olingan bo‘lsa, uning `triggers.crons` maydonini ham yangilash kerak.

Lokal testlar hosted Workers CPU limitini tasdiqlamaydi. Ayniqsa 25 ta uzun, 100 savolli yozma ishni bir vaqtda baholash uchun hosted CPU o‘lchovi kerak. Savollar soni va yozma javob uzunligiga qarab baholash xarajati farq qiladi.

Oldingi 15–17 soniyalik autosave oralig‘i saqlandi; frontend faqat dirty draft yuboradi. Free kvota hanuz hisobning boshqa ishlari bilan umumiy. Ixcham saqlash eski ochiq frontend tablariga tatbiq etilishi uchun foydalanuvchi yangilangan frontendni yuklashi kerak.
