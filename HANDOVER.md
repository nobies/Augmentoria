# Augmentoria — Project Handover

**آخر تحديث:** 31 أغسطس 2026
**حالة المنتج:** Cloud preview منشورة — الواجهة وSupabase Realtime وDatabase foundation وروابط Review الآمنة بكود دخول متاحة؛ Auth وDurable app data وGoogle Drive ما زالت مراحل لاحقة
**الفرع الحالي وقت إعداد الملف:** `codex/freeframe-review-integration`

> هذا الملف هو المرجع التنفيذي لحالة المشروع الحالية. الرؤية الأصلية موجودة خارج المشروع في `C:\tmp\plan.txt`، أما هذا الملف فيفصل بين ما هو مطلوب نظريًا وما تم تنفيذه فعليًا في الكود.

---

## 1. ما هو المشروع؟

Augmentoria منصة تعاون وإدارة إنتاج فيديو تجمع داخل Project Workspace واحد:

```text
Company
  └─ Client
      └─ Project
          ├─ Assets
          ├─ Versions
          ├─ Video Editor
          ├─ Review & Visual Feedback
          ├─ Live Review Sessions
          ├─ Approvals
          └─ Reports
```

الهدف النهائي ليس مجرد Video Review Tool ولا مجرد Video Editor، بل دورة عمل كاملة:

```text
Assets → Edit → Version → Review → Comments → Revision → Approval → Report
```

المراجع الأساسية للرؤية:

- Frame.io وClapshot لفلسفة الـReview والتعليقات والتزامن.
- FreeCut كمحرك تحرير محتمل على المدى البعيد.
- OpenReel كمرجع لتجربة الـEditor والـPanels والـInspector.
- FreeFrame كخدمة مفتوحة المصدر تم تقييمها وعزلها، وليست حاليًا واجهة المنتج الأساسية.
- Screener/Dropmedia كمرجع لشكل تقارير المراجعة.

---

## 2. القرارات المعمارية المتفق عليها

1. **Review واحدة موحدة:** لا يوجد نظاما Review منفصلان للمستخدم.
2. **حساب وإعدادات موحدة:** Admin المشروع هو نفسه Admin الـReview، ولا توجد شاشة Login أو Settings ثانية خاصة بمحرك خارجي.
3. **الحفاظ على فكرة المنتج الأساسية:** أي Engine خارجي يركب خلف Adapter ولا يتحكم في هوية المنتج أو الـProjects أو الصلاحيات.
4. **التنفيذ المحلي أولًا ثم Cloud preview:** اكتملت واختبرت الوظائف المحلية، وبدأت مرحلة الأونلاين بنشر Preview وربط Supabase. Google Drive والنقل الكامل للبيانات ما زالا مرحلتين مستقلتين.
5. **Storage abstraction:** واجهة `MediaStorageProvider` تفصل المنتج عن IndexedDB حاليًا، وتسمح بإضافة Google Drive أو S3 لاحقًا.
6. **لا Transcoding إجباري:** الملفات القابلة للتشغيل في المتصفح لا يلزم تحويلها. الـProxy/FFmpeg يستخدم فقط للصيغ الثقيلة أو غير المدعومة أو لتسريع التوزيع.
7. **FreeFrame معزول:** موجود تحت `services/freeframe` للتقييم فقط. تشغيل Augmentoria المحلي واختباراته لا يحتاجان Docker أو FreeFrame.

تفاصيل قرار FreeFrame موجودة في `docs/freeframe-integration.md`.

---

## 3. التقنية الحالية

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Framer Motion

### التخزين المحلي

- بيانات الشركات والمشاريع والمستخدمين والتعليقات والجلسات: `localStorage` عبر `src/lib/store.ts`، مع حذف الصور الثنائية من نسخة الحفظ لتجنب امتلاء المساحة.
- ملفات الـAssets والفيديو المعين لكل Version وComment thumbnails: IndexedDB عبر `src/lib/idb.ts` و`src/lib/mediaStorage.ts`.
- Timeline الخاصة بالمحرر: `localStorage` لكل Project/Version.

### التزامن

- WebSocket development server في `scripts/realtime-server.mjs`.
- المنفذ الافتراضي: `8787`.
- `BroadcastChannel` للتزامن بين Tabs المحلية.
- Supabase Realtime Broadcast/Presence يستخدم تلقائيًا في النسخة المنشورة.
- الرسائل اللحظية تعمل أونلاين، لكن الحالة الدائمة للتعليقات والجلسات ما زالت تعتمد على المتصفح حتى استكمال Database adapter.

### Cloud foundation

- GitHub: الفرع `codex/freeframe-review-integration` في `nobies/Augmentoria`.
- Vercel: Preview تلقائية من الفرع، مع إعداد Vite SPA وdeep-link rewrites في `vercel.json`.
- Supabase: مشروع `augmentoria` في `eu-west-1`، مع 22 جدولًا للـmulti-tenant domain وكل الجداول العامة عليها RLS.
- مشاركة الـReview: الرابط العام لا يتطلب حسابًا داخل التطبيق، لكنه يحتاج token عشوائي + كود منفصل من 6 أرقام. التوكن والكود مخزنان كـhash، والصلاحية 1–30 يومًا، وبعد 10 محاولات خاطئة يُقفل الرابط 15 دقيقة.
- `VITE_PUBLIC_APP_URL` يحدد الـorigin الثابت الذي تُنشأ عليه روابط المشاركة؛ وفي غيابه يستخدم التطبيق الـorigin المفتوح حاليًا.
- دوال RLS الحساسة نُقلت إلى schema خاصة وغير معروضة كـRPC للزائر.
- جداول الـlegacy محفوظة للرجوع فقط ومغلقة أمام `anon` و`authenticated`.
- أضيفت سياسات `project_memberships` وفهارس المفاتيح الأجنبية للجداول النشطة.
- ملفات migrations موجودة تحت `supabase/migrations/`.

### الاختبارات

- Vitest لاختبارات الوحدات.
- Playwright لاختبارات End-to-End والصلاحيات.
- Realtime smoke test مستقل.

---

## 4. خريطة أهم الملفات

| المسار | المسؤولية |
|---|---|
| `src/App.tsx` | Routes الرئيسية وحماية المسارات |
| `src/lib/store.ts` | الـLocal domain state والـActions والـSeed data |
| `src/lib/rbac.ts` | الأدوار والصلاحيات |
| `src/context/AuthContext.tsx` | جلسة الدخول المحلية وحساب الصلاحيات |
| `src/lib/mediaStorage.ts` | Storage provider وIndexedDB implementation |
| `src/lib/assets.ts` | تحميل وعرض وإدارة Assets المشروع |
| `src/lib/realtime.ts` | Supabase Realtime/WebSocket/BroadcastChannel client |
| `src/lib/supabase.ts` | Supabase browser client باستخدام publishable key فقط |
| `src/lib/reviewShare.ts` | إنشاء رابط Review آمن والتحقق من كوده عبر Supabase RPC |
| `src/pages/review/GuestReviewRoute.tsx` | بوابة الضيف بالكود بدون Registration |
| `src/pages/review/ShareReviewDialog.tsx` | إنشاء ونسخ الرابط والكود وتحديد مدة الصلاحية |
| `supabase/migrations/` | RLS hardening وسياسات العضويات والفهارس |
| `vercel.json` | Vite build وSPA routing على Vercel |
| `src/pages/review/ReviewWorkspace.tsx` | شاشة الـReview الموحدة |
| `src/pages/review/Player.tsx` | Video player والـInteractive timeline |
| `src/pages/review/OverlayLayer.tsx` | الرسم والصور والنص وFree Transform |
| `src/pages/review/CommentsPanel.tsx` | التعليقات والـRange feedback والـReplies |
| `src/pages/review/ComparePage.tsx` | مقارنة Versions أو Assets |
| `src/pages/editor/VideoEditorPage.tsx` | المحرر غير الهدام المحلي |
| `src/pages/app/ProjectDetailPage.tsx` | Project workspace والـAssets والـSessions |
| `src/pages/app/ReportsPage.tsx` | التقارير والفلاتر والتصدير |
| `src/lib/exportReview.ts` | CSV/XLSX/JSON/PNG exports |
| `scripts/dev-local.mjs` | تشغيل Vite والـRealtime معًا |
| `e2e/phase0.spec.ts` | سيناريوهات المنتج الأساسية |
| `e2e/role-matrix.spec.ts` | اختبار جميع الأدوار والصلاحيات |

---

## 5. المسارات الرئيسية

| المسار | الاستخدام |
|---|---|
| `/` | Landing page |
| `/login` | دخول Demo محلي |
| `/app` | Dashboard |
| `/app/projects` | قائمة المشاريع |
| `/app/projects/:id` | Project workspace |
| `/studio/review/:pid/:version` | Review داخلية موحدة ومحمية |
| `/review/:pid/:version` | Public/client review |
| `/studio/compare/:pid/:vA/:vB` | مقارنة نسختين |
| `/studio/asset-compare/:pid/:assetA/:assetB` | مقارنة فيديوهين من Assets |
| `/studio/editor/:pid/:version` | Video editor المحلي |
| `/app/reports/:pid/:version` | تقرير Version |
| `/app/settings` | Profile وCompany settings الموحدة |
| `/studio/pro-review/:pid/:version` | Compatibility alias يفتح نفس الـReview الموحدة |

---

## 6. ما تم تنفيذه فعليًا

### 6.1 إدارة المنتج والمشاريع — مكتمل محليًا

- Dashboard وProjects وClients وMembers وReviews وReports.
- إنشاء وتعديل وأرشفة Projects.
- Versions وحالات Editing / Review / Changes / Approved.
- Project team management.
- Company branding: logo، color، tagline.
- Settings موحدة للحساب والشركة بدل Settings منفصلة للـReview.
- 404 حقيقي للمسارات أو Projects أو Versions غير الموجودة.

### 6.2 المستخدمون والصلاحيات — مكتمل كنموذج محلي

الأدوار الموجودة:

- `super_admin`
- `company_admin`
- `am`
- `assistant`
- `ops`
- `designer`
- `client`

الصلاحيات تغطي إدارة الشركات والعملاء والأعضاء والمشاريع والفريق ورفع النسخ والتعليقات والرسم والاعتماد والتقارير. واجهة المستخدم والمسارات تم اختبارهما بكل Role.

الإضافات المنفذة:

- فصل `Account type` إلى Internal أو Client/External حتى لا يتحول المستخدم الخارجي إلى موظف داخلي بسبب Custom Role.
- `ProjectMembership` صريح بدور مستقل داخل كل مشروع: Owner/Manager/Editor/Reviewer/Viewer.
- سياسة وصول للمشروع: جميع أعضاء الشركة الداخليين أو الأعضاء المعيّنون فقط.
- المشاريع الجديدة تبدأ `Assigned members only`، مع Migration محافظة للمشاريع التجريبية القديمة.
- منع حذف/خفض آخر Owner في المشروع.
- Audit log محلي لتغييرات العضوية والأدوار والصلاحيات والمشروع.
- Assignment notifications عند إضافة عضو للمشروع أو إزالته.
- التحقق من الصلاحيات موجود داخل Domain actions نفسها، وليس اعتمادًا على إخفاء الأزرار فقط.

**مهم:** هذه حماية Client-side محلية محسنة، وليست بديلًا عن Server-side authorization أو Database RLS في النسخة الأونلاين.

### 6.3 Assets وربطها بالمشروع — مكتمل محليًا

- رفع Video/Image Assets من Project Assets tab.
- تخزين الملفات في IndexedDB بدل الذاكرة المؤقتة.
- Notes للـAssets وحذفها.
- تعيين Video Asset إلى Version معينة واستخدامه مباشرة داخل الـReview.
- استخدام Assets داخل الـEditor.
- اختيار فيديوهين من Assets وفتحهما في Compare.
- `MediaStorageProvider` جاهز لإضافة Provider أونلاين لاحقًا.

### 6.4 Review الموحدة — مكتملة محليًا بدرجة جيدة

- Internal review وPublic/client review على نفس Workspace.
- تشغيل/إيقاف، Fullscreen، Frame stepping، Volume، Timecode.
- Timeline markers للتعليقات.
- Timeline يدعم click وdrag scrubbing المتصل وKeyboard arrows.
- Frame comments وRange comments مع Mark In/Out.
- Replies وResolve/Unresolve وحذف حسب الصلاحية.
- الضغط على Comment ينقل الفيديو إلى نفس الـTimecode.
- رابط عميق `?comment=id` يعيد فتح التعليق عند موضعه.
- Clean frame thumbnail وAnnotated thumbnail للتعليق.
- تخزين الـComment thumbnails في IndexedDB بدل `localStorage`، مع ترحيل تلقائي عند عرض الصور القديمة وتنبيه واضح عند امتلاء التخزين.
- Comments drawer responsive للموبايل والتابلت.
- Public reviewer يستطيع التعليق والاعتماد بدون الحصول على صلاحيات الإدارة الداخلية.

### 6.5 Visual Feedback وFree Transform — مكتمل محليًا

الأدوات الحالية:

- Pen
- Arrow
- Circle
- Rectangle
- Text
- Image overlay

الخصائص:

- أكثر من Layer داخل التعليق الواحد.
- إظهار/إخفاء وحذف Layers.
- Color وOpacity وRotation وقيم X/Y/W/H.
- Free Transform مباشر للعناصر المدعومة:
  - Drag للتحريك.
  - Corner handles لتغيير الحجم.
  - Top handle للدوران.
- يمكن نشر الرسم أو الصورة بدون كتابة نص؛ يسجل كـ`Visual feedback` أو `تعليق بصري`.
- الرسم والـLayers تبقى بيانات قابلة للعرض وليست Screenshot مسطحة فقط.

**قيد حالي:** Free Transform المباشر لا يطبق على مسار Pen نفسه؛ يمكن إظهاره أو إخفاؤه أو حذفه، لكن تعديل نقاطه بعد الرسم يحتاج مرحلة لاحقة.

### 6.6 Live Review Sessions — مكتملة محليًا وRealtime transport متاح أونلاين

- Start Live Session وEnd Session.
- Presence وعدد المشاركين.
- تزامن Play/Pause/Seek والـPlayhead بين Tabs/Users.
- Request Control ثم قبول الطلب أو Take Control.
- منع نقل التحكم من مستخدم غير الـHost، مع السماح لصاحب الجلسة الحالي بإنهائها حتى لو كان Client بعد نقل التحكم إليه.
- الرجوع من Compare مباشرة إلى الـSession النشطة.
- عند إنهاء Session يتم حفظ:
  - وقت البداية والنهاية.
  - المشاركين.
  - Comment snapshots وThumbnails.
  - Event log: started/play/pause/seek/control requested/control changed/ended.
- إعادة فتح الجلسة من `Project → Sessions → View archive`.
- الضغط على Comment محفوظ يفتح الـReview عند التعليق والـTimecode.

**قيد حالي:** عند إغلاق Session يتم Snapshot لتعليقات الـVersion الموجودة وقت الإغلاق. الفصل الدقيق بين التعليقات التي أنشئت داخل وقت الجلسة فقط والتعليقات السابقة يحتاج Backend timestamps/query واضحة في المرحلة الأونلاين.

### 6.7 Compare — مكتمل محليًا

- مقارنة Version مع Version.
- مقارنة Asset video مع Asset video.
- مصادر فيديو مستقلة لكل جانب.
- Playheads متزامنة.
- Side-by-side.
- Wipe.
- Overlay/Opacity.
- Flicker.
- زر رجوع واضح للـLive Session أو الـReview.

### 6.8 Approvals — مكتملة محليًا

- Approve Version.
- Request Changes مع Note إجباري.
- حفظ القرار، المستخدم، الوقت، والملاحظة.
- إظهار القرار داخل الـReview والـReport.
- الصلاحيات تمنع المستخدم غير المسموح له من الإدارة أو التصدير.

### 6.9 Reports — مكتملة محليًا كنسخة عملية

- تقرير مرئي قابل للطباعة أو الحفظ PDF من المتصفح.
- Comment thumbnails مع الرسومات والصور.
- Timecode، Author، Replies، Status، Layers.
- Approval information.
- Live session information.
- فلاتر All/Open/Resolved وReviewer.
- اختيار تضمين Replies وDrawings وApproval وSessions.
- Export CSV.
- Export XLSX.
- Export JSON للجلسة.
- Export annotated frame PNG من الـReview.

**قيد حالي:** الـPDF يعتمد على `window.print()` وليس Server-side PDF renderer ثابتًا.

### 6.10 Video Editor — Prototype محلي فعال وليس محررًا احترافيًا كاملًا

الموجود حاليًا:

- Non-destructive timeline document لكل Project/Version.
- إضافة Version video أو Video Assets كـClips.
- Trim عن طريق In/Out.
- Split at playhead.
- Playback speed.
- Volume وMute لكل Clip.
- إضافة Video وAudio assets إلى Media bin.
- حذف Clip.
- إعادة ترتيب Clips بالأزرار أو Drag & Drop.
- Undo/Redo محلي حتى 50 خطوة، مع `Ctrl/Cmd+Z` و`Shift+Ctrl/Cmd+Z`.
- حفظ Timeline محليًا.
- قبول Review visual layers وإضافتها إلى Timeline plan.
- Export Timeline JSON وCMX3600 EDL.

غير الموجود بعد:

- Multi-track حقيقي Video/Audio.
- Composition/rendering نهائي للـClips.
- Multi-track audio mixer/waveforms.
- Transitions/effects/color grading/keyframes/masks.
- Autosave/version history احترافية ومستمرة على Backend.
- Ripple/Roll/Slip/Slide edits.
- Browser أو Cloud video export نهائي.
- دمج FreeCut production engine فعليًا.

إذًا شاشة الـEditor الحالية تثبت الـWorkflow والربط مع Assets وReview، لكنها ليست بديلًا جاهزًا لـPremiere أو FreeCut.

---

## 7. FreeFrame وDocker وFFmpeg

FreeFrame pinned داخل `services/freeframe` كـGit submodule وخدمة تقييم اختيارية.

- ليس مطلوبًا لتشغيل Augmentoria.
- لا يظهر Login أو Settings أو Project hierarchy خاصة به للمستخدم.
- لا توجد حاليًا مزامنة Production بين بيانات Augmentoria وFreeFrame.
- تشغيله اختياري لدراسة APIs أو نقل أجزاء مناسبة لاحقًا.

FFmpeg ليس جزءًا إجباريًا من المسار المحلي الحالي. سيحتاجه المشروع مستقبلًا في حالات مثل:

- إنشاء Proxies للصيغ الثقيلة.
- Thumbnail/filmstrip/waveform generation على السيرفر.
- Transcoding للصيغ غير المدعومة في المتصفح.
- Cloud rendering النهائي.

راجع `docs/freeframe-integration.md` لأوامر تشغيل خدمة التقييم وحدود استخدامها.

---

## 8. ما لم يتم بعد — خطة العمل المتبقية

### P0 — تحويل النسخة المحلية إلى Online Production System

هذه هي الأولوية التالية قبل اعتبار المنتج جاهزًا للعمل الحقيقي:

- [x] اختيار Backend وDatabase architecture: Supabase Postgres/Auth/Realtime.
- [ ] نقل Companies/Users/Clients/Projects/Versions/Comments/Sessions/Approvals من `localStorage` إلى Database.
- [ ] Authentication حقيقي: email/password أو SSO، reset password، sessions، invitations.
- [x] إنشاء multi-tenant schema وRLS foundation؛ ما زال ربط كل Frontend actions بالـDatabase مطلوبًا.
- [ ] Share links آمنة بـtokens وexpiry وrevocation وoptional password.
- [ ] API ثابتة وIDs دائمة بدل IDs المحلية.
- [x] ربط Supabase Realtime Broadcast/Presence للنسخة المنشورة؛ durable event persistence ما زال مطلوبًا.
- [ ] حفظ الأحداث والتعليقات والـPresence/session state في Database.
- [ ] Rate limiting، validation، audit logs، monitoring، backups.
- [x] استخدام Supabase publishable key فقط داخل المتصفح وعدم رفع `.env` أو secrets.
- [x] GitHub branch وVercel Preview CI/CD؛ الدمج إلى `main` وتحويل Production مؤجلان إلى ما بعد القبول.

### P0 — Google Drive Storage

- [ ] Google OAuth وربط Drive على مستوى Company/Project.
- [ ] تنفيذ `GoogleDriveMediaStorageProvider` خلف الواجهة الحالية.
- [ ] Project folder mapping وإنشاء البنية المتفق عليها تلقائيًا.
- [ ] حفظ Drive file IDs وrevisions وpermissions في Database.
- [ ] Streaming/download links آمنة مع تجديد الصلاحية.
- [ ] اكتشاف الملفات الجديدة أو المعدلة عبر polling/webhooks.
- [ ] Proxy/CDN layer حتى لا يشغل الـEditor ملفات 4K/ProRes مباشرة.
- [ ] Upload resume، progress، retry، checksum، duplicate detection.
- [ ] سياسة حذف وأرشفة بدون فقد الأصل من Drive.

### P1 — Production Realtime & Sessions

- [ ] WebSocket authentication وربط كل Connection بالمستخدم والـTenant.
- [ ] Durable rooms تعمل مع أكثر من Server instance.
- [ ] Reconnect/resume وsequence recovery بعد انقطاع الشبكة.
- [ ] Session comments query حقيقية حسب وقت البداية والنهاية.
- [ ] Session recording/report أدق، مع قائمة Versions التي تمت مراجعتها.
- [ ] Activity log كامل لكل تغيير.
- [ ] Notifications ودعوات Live Session.

### P1 — Professional Editor

- [ ] اتخاذ قرار نهائي: دمج FreeCut كمحرك أو بناء Adapter/engine مخصص.
- [ ] مراجعة License وحدود إعادة استخدام FreeCut/OpenReel/Clapshot/FreeFrame قبل نقل كود.
- [ ] Multi-track timeline وAudio tracks.
- [ ] Frame-accurate editing وmedia clock موحد.
- [ ] Waveforms وfilmstrips وsource monitor.
- [ ] Text/Image/Graphics composition حقيقية.
- [ ] Keyframes، transitions، effects، masks، color، audio controls.
- [ ] Autosave/version history مشتركة ودائمة، وتوسيع Undo/Redo إلى Commands احترافية.
- [ ] Convert Review visual suggestion إلى Timeline element حقيقي، وليس مجرد ID داخل الخطة.
- [ ] Browser export للعمليات المدعومة.
- [ ] Render queue وCloud render للملفات الثقيلة.
- [ ] حفظ Timeline/Sequences في Backend بدل `localStorage`.

### P1 — Reports Production

- [ ] Server-side PDF generation بتصميم ثابت.
- [ ] Report templates وCompany white-label branding كامل.
- [ ] Range comment contact sheet: Start/Middle/End frames.
- [ ] Session report مستقل وتفصيلي.
- [ ] Report snapshots immutable حتى لا يتغير التقرير القديم بعد تعديل Comment.
- [ ] تخزين التقارير النهائية في Google Drive.
- [ ] XML/AAF exports وتثبيت EDL على media metadata حقيقية.

### P2 — تحسينات المنتج

- [ ] Swipe/drag حقيقي للـMobile bottom sheet، وليس فتح/إغلاق فقط.
- [ ] Focus/Cinema mode للموبايل Landscape.
- [ ] تعديل Pen points بعد الرسم.
- [ ] Comment carry-forward UI أكثر تفصيلًا مع mapping بين Versions.
- [ ] Search وadvanced filters للتعليقات والـAssets.
- [ ] Email notifications وربط الـin-app notifications بالـBackend.
- [ ] Storage usage dashboard.
- [ ] Custom domains وemail branding.
- [ ] Accessibility audit كامل واختبارات أجهزة فعلية.
- [ ] Internationalization كاملة لكل النصوص التي ما زالت English فقط.

---

## 9. القيود والمخاطر الحالية

| القيد | التأثير |
|---|---|
| البيانات الأساسية في `localStorage` | البيانات مرتبطة بالمتصفح ولا تصلح لفريق Production |
| ملفات Assets في IndexedDB | لا تتشارك بين الأجهزة ولا تصلح كمخزن مركزي |
| Supabase Broadcast غير دائم | التزامن اللحظي يعمل أونلاين، لكن Restart/عدم وجود مشارك لا يحفظ State ما لم يمر عبر Database adapter |
| Auth محلية Demo | لا توجد حماية حقيقية أو Password lifecycle |
| RBAC محلي داخل الواجهة وDomain actions | يجب فرض الصلاحيات مرة أخرى على API/Database/RLS |
| Public review بدون production token model | الرابط الحالي Demo وليس Share security نهائية |
| Editor بدون render engine | Timeline الحالية خطة مونتاج وليست فيديو Export نهائي |
| Browser Print للـPDF | النتيجة قد تختلف حسب Browser/Printer settings |
| Demo media | يجب رفع وربط الملفات الأصلية الفعلية لكل Version |
| FreeFrame غير موصل بالمنتج | لا يجب افتراض أن تشغيل Docker يعني وجود Integration مكتملة |

### Security note

- ملف `.env` محلي ويجب ألا يتم Commit له.
- أي API key استُخدم أثناء التطوير يجب تدويره قبل Staging/Production.
- لا تضع Secrets في Vite variables إلا إذا كانت مصممة أصلًا للظهور داخل المتصفح.

---

## 10. التشغيل المحلي

### المتطلبات

- Node.js حديث متوافق مع Vite 7.
- npm.
- متصفح حديث.
- Docker مطلوب فقط عند تقييم FreeFrame، وليس لتشغيل المنتج المحلي الأساسي.

### التثبيت

```bash
npm install
```

### تشغيل التطبيق والـRealtime معًا

```bash
npm run dev:local
```

ثم افتح:

```text
http://localhost:5173/
```

فحص خدمة الـRealtime المحلية:

```text
http://localhost:8787/health
```

### تشغيل Vite فقط

```bash
npm run dev
```

في هذه الحالة يستمر `BroadcastChannel` بين Tabs في نفس المتصفح، لكن WebSocket المحلية لن تكون متاحة ما لم تشغلها منفصلة:

```bash
npm run realtime:dev
```

---

## 11. الاختبارات وحالة الجودة

آخر نتيجة محلية مؤكدة — 31 أغسطس 2026:

- ESLint: ناجح بدون Warnings.
- TypeScript: ناجح.
- Production build: ناجح.
- Unit tests: **31/31 ناجحة**.
- End-to-End tests: **97/97 ناجحة** في الـfull run، واختبار نافذة المشاركة الآمنة الجديد ناجح ضمن `features.spec.ts` (الإجمالي الحالي 98 اختبارًا).
- Realtime smoke test: ناجح.
- Role matrix: جميع الأدوار السبعة + Public guest ناجحون.

الأوامر:

```bash
npm run lint
npm run test
npm run build
npm run test:realtime
npm run test:e2e
```

أو:

```bash
npm run check
npm run check:all
```

الـE2E تغطي ضمن أشياء أخرى:

- Login redirects و404.
- Desktop/mobile/tablet Review behavior.
- Public client permissions.
- Comments/annotations والـFree Transform.
- Visual-only posting.
- Timeline drag scrubbing.
- Live playback sync وRequest/Take Control.
- Session archive/replay.
- Version وAsset compare.
- Assets assignment.
- Video Editor trim/split.
- Unified Review بدون Login أو Settings مكررة.
- جميع الأدوار والصلاحيات.
- فصل الحساب الداخلي عن الخارجي، Project membership/access policy، منع تجاوز الشركة، ومنع دور هرمي دائري.
- الحذف المتسلسل للمشروع والاستعادة الدقيقة لأدوار العضو داخل المشاريع.

---

## 12. حالة Git والنشر السحابي وقت التسليم

- تم فحص الملفات بحثًا عن secrets؛ ملف `.env` مستبعد من Git، والواجهة تستخدم Supabase publishable key فقط.
- تم توثيق Local milestone وCloud preview على `codex/freeframe-review-integration` ورفعه إلى GitHub.
- تاريخ الفرع المحلي و`main` الموجود على GitHub غير مرتبطين؛ لذلك لم يتم force-push أو استبدال `main`.
- Vercel Preview تبنى تلقائيًا من الفرع ويستخدم alias ثابتًا خاصًا به.
- Production الحالية المرتبطة بـ`main` لم تتغير.
- Supabase migrations طبقت بنجاح، ومنها `secure_review_share_links`. الـSecurity Advisor يعرض تحذيرًا مقصودًا لأن RPC التحقق متاح للضيف، وتحذيرًا مؤقتًا على RPC الإنشاء حتى استبدال الـLocal Auth بـSupabase Auth؛ بقي أيضًا تفعيل leaked-password protection.
- روابط الـPreview لن تكون عامة فعلًا إلا بعد إيقاف Vercel `Require Log In` لهذا المشروع؛ بوابة الكود داخل التطبيق هي الحماية المقصودة للضيف.
- لا يجب دمج الفرع في `main` قبل مراجعة الفرق المعماري واختيار طريقة دمج التاريخين بأمان.

---

## 13. خطة البداية المقترحة للمطور التالي

### Milestone 1 — تثبيت النسخة المحلية

- Commit الحالة الحالية بعد مراجعتها.
- إضافة Seed reset واضح للـDemo.
- توثيق Browser support وحدود الملفات المحلية.
- إضافة اختبار Session archive لتعليقات أنشئت أثناء Session فعلية وليس Seed فقط.

### Milestone 2 — Backend foundation

- تصميم Database schema وtenant boundaries.
- Auth حقيقي وserver-side RBAC.
- نقل Projects/Comments/Sessions/Approvals أولًا.
- الحفاظ على نفس Frontend actions خلف API adapter لتقليل إعادة الكتابة.

### Milestone 3 — Google Drive provider

- تنفيذ OAuth وDrive provider.
- ربط Project folders وAsset metadata.
- Streaming/proxy strategy.
- اختبار الملفات الكبيرة وفقد/تجديد صلاحيات Drive.

### Milestone 4 — Production Realtime

- Authenticated rooms.
- Durable events وreconnect.
- Multi-device testing خلف HTTPS/WSS.

### Milestone 5 — Professional editing engine

- Spike محدود لاختيار FreeCut integration boundary.
- إثبات Timeline → Preview → Export على ملف حقيقي.
- بعد نجاح الـSpike فقط يبدأ نقل الخصائص الاحترافية.

### Milestone 6 — Production hardening

- Server-rendered reports.
- Monitoring/logging/backups.
- Security review.
- Load and media tests.
- Staging acceptance ثم Production rollout.

---

## 14. تعريف الجاهزية

### النسخة المحلية تعتبر ناجحة عندما

- تعمل بدون Docker.
- Assets المحلية تستخدم في Review/Compare/Editor.
- التعليقات والرسومات والـThumbnails محفوظة محليًا.
- Live Session تعمل بين Tabs/Users محليين.
- كل الاختبارات تمر.

**وهذه الحالة متحققة حاليًا.**

### النسخة Online تعتبر جاهزة فقط عندما

- يكون Auth وRBAC مفروضين على السيرفر.
- تكون كل البيانات والملفات Durable ومشتركة بين الأجهزة.
- Google Drive يعمل كمصدر أصل حقيقي مع Proxy delivery مناسب.
- Realtime يعمل عبر WSS مع reconnect وحفظ الأحداث.
- Share links آمنة بكود وصلاحية وقفل للمحاولات، مع واجهة Admin للإلغاء وإدارة الروابط النشطة.
- Reports ثابتة وقابلة لإعادة الإنتاج.
- يوجد Staging، monitoring، backups، security review، وCI/CD.

**وهذه الحالة لم تتحقق بعد ولا يجب وصف النسخة الحالية بأنها Production-ready.**

---

## 15. سجل مراجعة الجودة (QC Pass) — 26 أغسطس 2026

مراجعة كاملة بصفتي Project Tester / QC مع إصلاح ما وجدته. النتيجة التاريخية: **المنتج المحلي ناجح ووظيفيًا مترابط** — lint ✓ · Vitest 12/12 ✓ · Playwright E2E 26/26 ✓ · Build ✓. تم تحديث التغطية لاحقًا إلى 22/22 و97/97 في قسم الجودة أعلاه.

### ثغرات تم إصلاحها

1. **الأعضاء الموقوفون كانوا يحتفظون بكامل الوصول** — `AuthContext` كان يقرأ بيانات العضو الحية ويتجاهل `status`. الآن: جلسة عضو موقوف أو محذوف تُصبح غير صالحة تلقائيًا (logout فعلي)، ومحاولة تسجيل الدخول بحساب موقوف ترفض مع رسالة `auth_account_disabled`.
2. **عميل (client) كان يرى كل المشاريع** — مستخدم بدور `client` كان يفتح أي Project/Review حتى لو لم يُضف لفريقه. أُضيف `visibleProjects()` في `store.ts` وتطبيق الحجب على Dashboard وProjects وReviews وProjectDetailPage وReviewWorkspace الداخلية (404 لغير الأعضاء). الموظفون الداخليون يرون كل مشاريع الشركة كما هو متعارف عليه في وكالات الإنتاج.
3. **حماية من القفل الذاتي** — لا يمكن للأدمن تغيير دوره أو إيقاف نفسه أو حذف نفسه من شاشة Members.
4. **حماية من تصعيد الصلاحيات محليًا** — غير الـsuper_admin لا يستطيع تعيين أو تعديل دور super_admin، ولا تظهر خيار super_admin في Invite إلا للـsuper_admin.
5. **إضافة عضو موقوف لفريق مشروع** أصبحت تُظهر شارة Suspended بدل أن تبدو عضوًا نشطًا.
6. **تصحيح fixture اختبار** — `phase0.spec.ts` كان يستخدم عميل وهمي (`u-client`) غير موجود في البيانات؛ أصبح `u-sh` (Sara Hassan) وهو نموذج العميل الفعلي في الـSeed.

### تقييم تجربة الاستخدام (كـمستخدم)

- التسلسل Company → Client → Project → Version → Review منطقي ومتسق، والتنقل بينه واضح.
- إدارة الفريق داخل المشروع (Team tab) سهلة: إضافة من قائمة الأعضاء، إزالة بزر واحد.
- الصلاحيات المركبة (Role + Extra perms) مفهومة في الواجهة مع تمييز صلاحيات الدور عن الإضافات.
- ما ينقص سلاسة الاستخدام محليًا (غير الأونلاين): بحث وفلاتر للتعليقات والأصول، Notifications داخلية، Mentions، سلة مهملات/تراجع للحذف، تقويم Due dates مرئي.

---

## 16. الخلاصة التنفيذية

المشروع تجاوز مرحلة الـUI mockup وأصبح Local product prototype مترابطًا: Projects وAssets وVersions وReview وVisual Feedback وLive Sessions وCompare وApprovals وReports وEditor prototype يعملون معًا ومغطون باختبارات فعلية.

المرحلة التالية ليست إضافة Buttons جديدة، بل بناء الأساس الأونلاين الصحيح: Backend، Auth، Database، Google Drive، Production Realtime، ثم Professional Editor engine. يجب الحفاظ على الـUnified Review والـUnified Settings والـStorage abstraction وعدم إعادة إدخال نظامين منفصلين داخل نفس المشروع.
