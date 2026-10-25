# Bitta test to‘plamida ikki til

Katalogda bitta to‘plam ko‘rinadi. Uning kirish sahifasida o‘quvchi **O‘zbekcha** yoki **Qaraqalpaqsha** variantini tanlaydi. Bu savollar tili bo‘lib, interfeys tilidan mustaqil. Test boshlanganidan keyin til o‘zgarmaydi; qayta ochilganda oldingi tanlov tiklanadi.

Har til o‘zining immutable savollar versiyasi va javob kalitidan foydalanadi. Ikkala variant to‘plamning bitta jadvali va urinish cheklovini ishlatadi: rejalashtirilgan oynada tilni almashtirib qo‘shimcha urinish olish mumkin emas. Doim ochiq to‘plamda topshirilgandan keyingi yangi urinish uchun til yana tanlanishi mumkin.

Adminning to‘plam bo‘yicha va umumiy natijalar jadvallarida **Test tili** ustuni bor. Tekshirish oynasida ham til ko‘rsatiladi. Tarixiy o‘zbekcha urinishlar `uz` deb belgilanadi, savollar va baholar o‘zgartirilmaydi.

## Tuzilishi va deploy tartibi

Avval `0010_collection_languages.sql` migratsiyasini, so‘ng yangi Worker/frontendni deploy qilish kerak. Readiness ushbu migratsiyani talab qiladi. Migratsiya:

- `collection_languages` jadvalini yaratadi;
- mavjud to‘plamlarning o‘zbekcha versiyasini qayd etadi;
- urinishga `language` maydonini qo‘shadi;
- boshlangan urinishning tilini yoki savollar versiyasini SQL UPDATE bilan ham almashtirishni taqiqlaydi.

Yangi qoraqalpoqcha versiya `is_public=0` bo‘lgan e’lon qilingan test versiyasi sifatida saqlanadi. Alohida katalog kartasi yaratilmaydi. Admin/egasi uni `POST /api/v1/staff/collections/:id/languages` orqali `{language:"kaa",testVersionId:"UUID"}` bilan biriktirishi mumkin. Savol soni va test rejimi asosiy variant bilan teng bo‘lishi, versiyaga murojaat qilish huquqi mavjud bo‘lishi kerak. Reopen shu savollarni ishlatadigan yangi oynaga til variantlarini ham nusxalaydi. Savollar tarkibi o‘zgargan yangi nashrga tarjima o‘z-o‘zidan ko‘chirilmaydi.

O‘quvchi `POST /api/v1/exams/:id/start` da `language` yuboradi. Eski frontend bilan moslik uchun maydon berilmasa mavjud urinish tili yoki `uz` ishlatiladi. `GET /exams/:id` `languages` va `attemptLanguage` beradi; urinish va admin natijalari `language` qaytaradi. Savol matnlari va kalitlari katalog metama’lumotlariga kiritilmaydi.

## Ushbu DOCX faylni tayyorlash

`scripts/convert-karakalpak-mock.py` asl DOCX matnini o‘qib, platformaning qat’iy CSV ustunlarini yaratadi. Manbada 8-savol yo‘q edi; egasining ruxsati bilan mavjud o‘zbekcha savoldan tarjima qo‘shildi. Natija **45 savol: 35 variantli, 10 yozma**. Variantli savollarning javoblari raqam va mazmun bo‘yicha oldingi nashrga solishtirildi; yozma javob namunalari qoraqalpoqchaga moslashtirildi.

23 va 36-savollarda ostiga chizilgan bo‘lim oddiy matnli CSV yo‘qotmasligi uchun alohida iqtibos bilan ko‘rsatildi. Manbadagi 18-savol C/D variantlari takrori saqlandi. Muallifning kirish yozuvi va telefoni savollarga kiritilmadi. Mavjud nashrning javob kalitlari huquqiy mazmun jihatidan qayta tahrir qilinmadi.

CSV UTF-8 BOM bilan `exports/huqiqtaniw-mock-test-1-kaa.csv` ga yoziladi. Fayl va uning manifesti, xususiy javob kalitlari hamda tarjima sozlamalari Git’ga qo‘shilmaydi. Ular `public/` yoki frontend assets’ga ham joylashtirilmaydi.

```powershell
python -X utf8 scripts/convert-karakalpak-mock.py --source "DOCX_PATH" --keys ".worker-build/karakalpak-import/uz-source.json" --translations ".worker-build/karakalpak-import/translation-overrides.json" --output "exports/huqiqtaniw-mock-test-1-kaa.csv"
```

`scripts/prepare-mock-language-import.mjs` CSV’ni ilovaning o‘z parseri va serverning nashr validatori bilan tekshiradi. U tarmoqqa ulanmaydi; tekshirish mumkin bo‘lgan SQL va manifest tayyorlaydi. CSV xeshi va to‘plamga asoslangan barqaror ID’lar qayta bajarishda dublikat hosil qilmaydi. SQL asosiy to‘plam, versiya, egasi, savol soni va rejimni tekshiradi; barcha savollar tayyor bo‘lgandan keyingina tarjimani biriktiradi. Mavjud to‘plam jadvali yoki o‘quvchi natijalarini o‘zgartirmaydi.

## Tekshiruv

- 185 avtomatik Worker/D1 test o‘tdi, shu jumladan parallel til tanlash, variantga ruxsat, boshqa tilga o‘tishni rad etish, baholash, tarixiy moslik va reopen.
- `python -X utf8 scripts/verify-exam-ui.py`: 23 haqiqiy lokal brauzer tekshiruvi o‘tdi. Til tanlash, interfeys tilidan mustaqillik, resume, saqlash va admin ustuni tekshirildi.
- 45 savolli haqiqiy CSV import parseridan xatosiz, ogohlantirishsiz va dublikatsiz o‘tdi.
- Tayyor SQL lokal bazada ikki marta bajarilib, aynan 45 savol va bitta til bog‘lanishi saqlanishi tekshirildi.
- TypeScript, production build, Worker dry-run, maxfiy kalitlarning browser bundle’iga chiqmasligi va npm audit tekshirildi.
