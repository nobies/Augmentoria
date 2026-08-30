# Augmentoria — Local Product & UX Audit

تاريخ المراجعة: 2026-08-30

## جولة الإصلاح وإعادة التحقق — 30 أغسطس 2026

تم تنفيذ الإصلاحات التالية بعد الجولة الأصلية، ثم إعادة الاختبار بنفس مسار المستخدم الطبيعي:

- إضافة `projectInUserScope` و`clientInUserScope` مركزيًا وربطها بـReview وCompare وEditor وReports وProject/Client detail.
- تقييد العملاء وأعضاء الفريق بالشركة، مع منع الأعضاء الموقوفين، والتحقق مرة ثانية داخل أفعال الـstore.
- إصلاح بيانات InstaMart القديمة (`u-ns` و`u-tk`) مع migration تنظف IDs المفقودة أو cross-tenant.
- جعل التقارير تستخدم مشاريع وشركة المشروع فقط، وإضافة بحث ورسالة empty state للمشاريع.
- تقييد تعديل/حذف طبقات التعليقات، وإضافة تحقق actor لصناعة قرارات الاعتماد الداخلية.
- إصلاح وراثة صلاحيات الـCustom Roles، وإضافة أسماء Super Admin وStudio Admin في اللغتين.
- حفظ اختيار اللغة، إصلاح عداد الملاحظات المفتوحة، تحسين عرض نهاية الـclip، وإضافة تسميات وصول للـforms والحساب.
- حماية الحفظ المحلي من `QuotaExceededError` حتى لا يفشل التعديل بسبب امتلاء التخزين.

نتيجة التحقق الآلي: `npm run lint` ✅، `npm test` (22/22) ✅، `npm run build` ✅، `npm run test:e2e` (97/97) ✅، و`npm run test:realtime` ✅.

نتيجة التحقق اليدوي: رابط AROMA إلى InstaMart أعاد 404، رابط Compare لمشروع Socializr أعاد 404، مدير Socializr لم يستطع فتح Vodafone، قائمة Reports لدى AROMA لا تعرض InstaMart، وقائمة Team تعرض أعضاء الشركة النشطين فقط. تمت مراجعة Review بالعربية على Desktop وMobile مع فتح/غلق لوحة التعليقات.

## الخلاصة التنفيذية

النسخة المحلية أصبحت Prototype وظيفيًا قويًا في مسار الفيديو الأساسي: Project → Asset/Version → Review → Comment/Annotation → Session → Approval → Report. جولة الإصلاح أغلقت مشاكل العزل والصلاحيات التي ظهرت في المراجعة الأصلية، مع بقاء حدود معروفة تخص مرحلة Online/Google Drive وسياسة روابط المشاركة العامة.

## ما تم اختباره فعليًا

- تسجيل الدخول بكل الأدوار المتاحة: Super Admin، Company Admin، Account Manager، AM Assistant، Operations، Designer، Client.
- Dashboard، Projects، Calendar، Project workspace، Versions، Sessions، Team، Assets، Clients، Reports، Settings، Review، Compare، Editor.
- مراجعة Desktop وMobile؛ فتح وإغلاق لوحة التعليقات على الهاتف؛ الانتقال من Compare إلى Review.
- Review موحدة عبر `/studio/review` و`/studio/pro-review`، ورابط Public عبر `/review`.
- الصلاحيات الظاهرة والتنقل، إضافة عضو، الأدوار المخصصة، الجلسة المؤرشفة، التعليقات والـthumbnails، والتزامن المحلي.

## ما يعمل جيدًا

1. تجربة Review موحدة ولا توجد شاشة Login أو Settings ثانية للمحرك.
2. التعليق على Frame أو Range، replies، checklist، resolve، deep-link إلى التعليق، وthumbnail مع الرسم.
3. أدوات الرسم الأساسية وFree Transform للعناصر، ونشر Visual feedback بدون نص.
4. جلسة Live محلية مع Play/Pause/Seek وPresence وEvent log وحفظ Archive.
5. مقارنة Version/Version وAsset/Asset مع Side-by-side وWipe وOverlay وFlicker.
6. Project assets في IndexedDB مع ربط Video Asset بالـVersion وفتحها في Review/Editor.
7. تقارير قابلة للطباعة/CSV/XLSX/JSON مع فلاتر ورسومات وقرارات وجلسات.
8. Responsive review drawer يعمل على الهاتف، وTimeline click/drag يعملان في الاختبار.
9. إيقاف الشركة يوقف دخول أعضائها، و`/app` محمي، وNon-access page موجودة.

## العيوب الحرجة P0 — خط أساس الجولة الأصلية (تمت معالجتها)

### 1) عزل المشروع والشركة غير مطبق على كل المسارات

التطبيق يقيد العميل في `ReviewWorkspace` فقط، بينما Compare وReports وEditor وProject/Client detail تعتمد غالبًا على `pid/id` الموجود في الرابط. النتيجة التي أعدت إنتاجها:

- عميل Vodafone فتح Compare لمشروع Flynas غير معين له: `/studio/compare/p-flynas/V01/V02`.
- مدير Socializr فتح Review لمشروع Vodafone: `/studio/review/p-vodafone/V04`.
- Account Manager في AROMA فتح عميل InstaMart التابع لـSocializr: `/app/clients/cl-instamart`.
- نفس المستخدم يستطيع الوصول إلى Project detail/Reports/Editor عبر الرابط المباشر إذا امتلك الصلاحية العامة.

الموضع الأساسي: `src/pages/review/ComparePage.tsx`، `src/pages/app/ReportsPage.tsx`، `src/pages/editor/VideoEditorPage.tsx`، وشرط العضوية المحدود في `src/pages/review/ReviewWorkspace.tsx`.

الإصلاح: إنشاء helper مركزي مثل `authorizeProject(user, project, capability)` واستخدامه قبل render في كل صفحة مرتبطة بالمشروع، مع فحص `companyId` وعضوية العميل/الفريق والصلاحية المطلوبة، وليس إخفاء الرابط فقط.

### 2) إنشاء/تعديل المشروع يسمح بخلط عملاء الشركات

`NewProjectModal` و`EditModal` يعرضان كل `state.clients`، وليس عملاء الشركة الحالية. يمكن لمستخدم AROMA إنشاء مشروع AROMA مرتبط بعميل InstaMart في Socializr أو نقل مشروع إلى عميل شركة أخرى. يجب تقييد الخيارات بـ`visibleClients` والتحقق مرة ثانية داخل action.

### 3) إضافة أعضاء المشروع تسمح بأعضاء من شركة أخرى أو عضو موقوف

`AddMemberModal` يستخدم كل `state.members`، و`actions.addTeamMember` لا يتحقق من الشركة أو الحالة. القائمة التي ظهرت تضمنت Nada/Tarek من Socializr أثناء إضافة عضو لمشروع AROMA. يجب عرض أعضاء الشركة الحالية النشطين فقط، مع تحقق domain/action وعدم السماح بإسناد cross-tenant.

### 4) التقارير تكشف مشاريع وشركات خارج النطاق

`ReportsPage` يستخدم `state.projects` كاملًا في selector، لذلك ظهر InstaMart لمستخدم AROMA. `ReportView` وReview تستخدمان `state.companies[0]` بدل شركة المشروع، ما يجعل هوية الاستوديو/branding خاطئة عند تعدد الشركات.

### 5) أفعال الـStore غير actor-aware

`addTeamMember`, `updateProject`, `deleteProject`, `recordApproval`, `updateClient` وغيرها لا تستقبل actor ولا تتحقق من permission/scope؛ الحماية الحالية في الواجهة فقط. حتى لو بقيت النسخة محلية، يجب جعل actions تقبل actor أو طبقة domain authorization، ثم تكرار الحماية على API/RLS في مرحلة Online.

### 6) بيانات Seed غير سليمة

مشروع `p-instamart` يحتوي `memberIds: ['u-na', 'u-so']`؛ `u-na` من AROMA و`u-so` غير موجود. لذلك يظهر Team count أقل من IDs الفعلية. يجب عمل migration/validation تنظف IDs غير الموجودة وتمنع member من شركة أخرى.

## ملاحظات P1 — خط أساس الجولة الأصلية (تمت معالجة البنود المحلية المحددة)

1. **عداد الجلسة غير صحيح:** بطاقة الجلسة تعرض `3 open notes` بينما لديها 2 مفتوحة و1 محلولة؛ الكود يعد كل التعليقات تحت label open.
2. **تحرير/حذف Layers غير مقيد:** `CommentsPanel` يعرض Edit/Delete للـLayers حتى للمستخدم العميل؛ `onDeleteLayer={actions.deleteLayer}` يمرر action بلا فحص moderator/author.
3. **اللغة العربية غير مكتملة داخل Review:** عناوين مثل Upload video، Editor، Unified settings، Demo clip، Export، Request changes وأدوات الرسم تبقى إنجليزية. كذلك `role_super_admin` و`role_company_admin` مفقودان من قاموس i18n فتظهر أدوارهما فارغة في Roles page.
4. **المحرر يعرض Clip من `0:00.0 → 0:00.0` رغم أن الفيديو 30 ثانية:** القيمة 0 تعني فعليًا نهاية المصدر، لكن العرض مربك ويجعل المستخدم يظن أن القصاصة فارغة.
5. **روابط/فلاتر Projects غير مكتملة النطاق:** selector العملاء يعرض عملاء كل الشركات، ولا توجد رسالة واضحة عند نتيجة فارغة بعد الفلترة، ولا بحث نصي للمشروعات.
6. **التبويب للعميل مزدوج:** `Projects` و`My Projects` يعرضان مسارين متشابهين؛ يجب تسمية الأول بوضوح أو الاكتفاء ببوابة العميل.
7. **Team CTA مكرر:** في Project Team يظهر زران `+ Add Member` في نفس الشاشة.
8. **دعوات الأعضاء محلية فقط:** لا توجد pending invitation/status أو قبول الدعوة؛ الزر يسجل عضوًا مباشرة في local state.
9. **Public review غير محكوم بسياسة مشاركة:** رابط `/review/:pid/:v` يعمل كضيف لأي ID صحيح، والضيف يستطيع التعليق والاعتماد/طلب التعديل. هذا مقبول كـDemo، لكنه يحتاج share policy واضحة حتى محليًا (visibility، expiry، revoke، optional password).
10. **الحفظ المحلي هش:** الحالة الأساسية والصور المصغرة بصيغة Data URL في `localStorage`؛ `emit()` لا يعالج QuotaExceededError. كثرة التعليقات قد تفشل كل التعديلات أو تجعل Realtime payload كبيرًا.
11. **Accessibility:** زر الحساب وأزرار الأيقونات في AppShell بلا `aria-label` واضح، وModals تحتاج focus trap، و`ReviewWorkspace`/`OverlayLayer` بها lint warnings/errors.

## مصفوفة الأدوار الحالية

| الدور | المتاح حاليًا | تقييم ونقطة تحتاج قرارًا |
|---|---|---|
| Super Admin | كل الشركات، إدارة الشركات والأعضاء والأدوار والمشروعات والتقارير | مناسب كدور منصة؛ يجب منع impersonation في الإنتاج |
| Company Admin | إدارة أعضاء/أدوار/مشروعات/فريق/نسخ/Review/تقارير، branding من Settings | جيد وظيفيًا، لكن cross-project/company direct URLs مفتوحة |
| Account Manager / Producer | عملاء، إنشاء/تعديل مشروعات، فريق، نسخ، Review، اعتماد، تقارير | واسع ومناسب للـProducer، لكن لا يوجد project-level scoping |
| AM Assistant | نسخ، تعليقات، رسم، تقارير؛ لا اعتماد أو مشاركة/Live | متوازن، لكنه يرى كل مشروعات الشركة بدل assignments فقط |
| Operations | تعديل مشروعات/فريق/نسخ/تعليقات/تقارير وLive sharing | يحتاج تعريفًا أدق: هل يحق له تعديل status/archive/approval workflow؟ |
| Designer | رفع نسخ، تعليقات، رسم، Editor | يستطيع فتح Editor لكل مشروعات الشركة؛ يجب ربطه بالمشروعات المعينة |
| Client | مشروعاته المعينة، Review، تعليق/رسم، Approve/Request changes | جيد في Project detail، لكن Compare/direct URLs وLayer controls تتجاوز النطاق |

ملاحظة معمارية: `Project.memberIds` مجرد array بلا access level أو project role أو assignedAt. أدوار الشركة (`roleId/customRoleId`) منفصلة عن عضوية المشروع، لذلك الإسناد الحالي لا يغير وصول الموظفين الداخليين؛ هو مؤثر فعليًا على العميل فقط.

## خطة إصلاح محلية مقترحة بالترتيب

### المرحلة A — Integrity & Authorization ✅ مكتملة محليًا

- توحيد `getScopedProjects`, `getScopedClients`, `authorizeProject`, `authorizeClient`.
- تطبيقها على Project detail، Review/Pro Review/Public review، Compare، Asset Compare، Editor، Reports وClient detail.
- تقييد كل selectors والقوائم حسب الشركة والنطاق.
- جعل Add/Edit Project وAdd Member/actions ترفض cross-company والموقوفين.
- إضافة migration تنظف dangling member IDs وتمنع seed غير صالح.
- منع تعديل/حذف Layer إلا للكاتب أو moderator، وحماية `recordApproval` وقرار الجلسة.

### المرحلة B — Team & Workflow UX (متبقي للمرحلة التالية)

- نموذج عضوية مشروع: `projectRole`, `accessLevel`, `assignedAt`, `assignedBy`.
- شاشة My Assignments، bulk assign، remove مع confirmation، وassignment notifications.
- حالة دعوة معلقة بدل الإضافة الفورية.
- توضيح من يملك approve/request/resolve/archive لكل Project.
- إصلاح counters، duplicate CTA، empty states، وتسميات الحقول.

### المرحلة C — Review/Editor polish (منفذ جزئيًا)

- إكمال i18n لكل النصوص، وإضافة role translations.
- عرض نهاية المصدر بدل `0` في clip inspector، وإضافة Undo/Redo وkeyboard shortcuts.
- تفعيل range thumbnail contact sheet (بداية/منتصف/نهاية) وخيار فتح الصورة كاملة.
- جعل mobile comments sheet قابلًا للسحب، وتحسين كثافة toolbar وfocus management.

### المرحلة D — Local reliability (متبقي للـOnline/التوسعة)

- نقل thumbnails الكبيرة من AppState إلى IndexedDB أو ملفات منفصلة، ومعالجة quota/errors.
- إضافة audit/activity لكل role/project assignment وasset change.
- تمت إضافة تغطية unit لعزل الموارد ورفض cross-company، مع تحقق يدوي مباشر للروابط والتقارير وقائمة الفريق؛ يمكن توسيعها إلى مصفوفة صلاحيات API عند بدء Online.

## نتائج الجودة الآلية — الجولة الأصلية

- `npm test`: **21/21 passed**.
- `npm run build`: **نجح** (`tsc` و`vite build`).
- `npm run test:e2e`: **97/97 passed**.
- `npm run test:realtime`: **نجح**.
- `npm run lint`: **فشل** بسبب أخطاء في `src/pages/review/Player.tsx` و`ReviewWorkspace.tsx`، وتحذير dependency في `OverlayLayer.tsx`؛ يلزم إصلاحها قبل اعتماد CI.

## الحكم النهائي بعد الإصلاح

المنتج المحلي قابل للتجربة كمكان عمل متعدد الشركات/الأفراد، والـReview الجديدة هي الواجهة الصحيحة فعلًا. تم إغلاق مشاكل assignment وscope والتقارير والـlayer moderation التي ظهرت في الجولة الأصلية، مع بقاء مرحلة Online/Google Drive وسياسة المشاركة العامة خارج نطاق النسخة المحلية.
