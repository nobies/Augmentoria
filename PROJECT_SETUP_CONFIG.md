# 🚀 Augmentoria — Project Setup & Environment Configurations Guide

> **دليل الإعداد الكامل للمشروع والانتقال لجهاز جديد**  
> يحتوي هذا الملف على كافة إعدادات المشروع، الروابط، المتغيرات البيئية (`.env.local`)، إعدادات GitHub، Supabase، و Vercel، وخطوات التشغيل خطوة بخطوة على أي جهاز جديد.

---

## 📌 1. معلومات المشروع الأساسية (Overview)

- **اسم المشروع**: Augmentoria (PostFlow Studio)
- **نوع المشروع**: Broadcast-grade Multi-tenant Post-Production & Video Review Platform
- **التقنيات المستخدمة (Stack)**:
  - **Framework**: Next.js 15 (App Router) + React 19 + TypeScript 5
  - **Styling**: Tailwind CSS 3
  - **Database & Realtime**: Supabase (PostgreSQL + Realtime WebSockets + Storage)
  - **Client Storage**: IndexedDB (Multi-Tenant Local Engine - 50 Clients / 500 Projects)
  - **Deployment**: Vercel (Auto CI/CD on `git push origin main`)
  - **Media Integrations**: YouTube IFrame API, Vimeo Player SDK, HTML5 Video Engine

---

## 🌐 2. روابط المنصة الحية والخدمات (Live Services & Links)

| الخدمة | الرابط | الوصف |
|---|---|---|
| **Vercel Live Production** | [https://augmentoria-sooty.vercel.app](https://augmentoria-sooty.vercel.app) | الموقع الحي المباشر |
| **GitHub Repository** | [https://github.com/nobies/Augmentoria](https://github.com/nobies/Augmentoria) | مستودع الكود المصدري |
| **Supabase Dashboard** | [https://supabase.com/dashboard/project/ygdqiuvysbkcdnoxjgxv](https://supabase.com/dashboard/project/ygdqiuvysbkcdnoxjgxv) | لوحة تحكم قاعدة البيانات |
| **Live Screener Studio** | [https://augmentoria-sooty.vercel.app/screener](https://augmentoria-sooty.vercel.app/screener) | أداة مراجعة الفيديو الرئيسية |
| **Studio Dashboard** | [https://augmentoria-sooty.vercel.app/dashboard](https://augmentoria-sooty.vercel.app/dashboard) | لوحة تحكم المشاريع والعملاء |

---

## 🔑 3. المتغيرات البيئية (Environment Variables)

أنشئ ملف باسم `.env.local` في مسار المشروع الرئيسي بالجهاز الجديد وضع فيه القيم التالية:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ygdqiuvysbkcdnoxjgxv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_rb2otWUPrMU6UzvR1PDJQg_hNasGrv8
```

> ⚠️ **ملاحظة**: هذا المفتاح (`anon key`) مخصص للواجهة الأمامية ومحمى عبر سياسات الأمان (RLS) في Supabase.

---

## 📦 4. إعدادات GitHub والمستودع (Repository & Branches)

- **Remote URL**: `https://github.com/nobies/Augmentoria.git`
- **الفروع الأساسية (Branches)**:
  - `main`: الفرع الرئيسي للنسخة V2.0 (مرتبط تلقائياً بـ Vercel للرفع الفوري).
  - `v1-screener-stable`: فرع النسخة القديمة المستقرة (محفوظة بالكامل للرجوع إليها في أي وقت).
- **العلامات الثابتة (Tags)**:
  - `v1.0.0-screener`: علامة ثابتة للنسخة الأولى قبل ترقية V2.

### أوامر التعامل مع الفروع:
```bash
# استنساخ المستودع
git clone https://github.com/nobies/Augmentoria.git

# الدخول للمشروع
cd Augmentoria

# التبديل لفرع النسخة القديمة (إذا احتجت مراجعتها)
git checkout v1-screener-stable

# العودة للفرع الرئيسي للنسخة الجديدة
git checkout main
```

---

## 🗄️ 5. إعدادات Supabase (Database, Realtime & Storage)

### أ) تفاصيل الاتصال:
- **Project URL**: `https://ygdqiuvysbkcdnoxjgxv.supabase.co`
- **Project Reference ID**: `ygdqiuvysbkcdnoxjgxv`
- **Region**: Frankfurt / EU Central (أو المنطقة المحددة عند الإنشاء)

### ب) جداول قاعدة البيانات (Database Tables):
1. `studios`: بيانات الاستوديوهات، الألوان، اللوجو.
2. `projects`: المشاريع، معدل الفريمات (FPS)، التايم كود الابتدائي.
3. `cuts`: نسخ المقاطع، روابط الفيديوهات (YouTube, Vimeo, MP4, Compare).
4. `notes`: ملاحظات المراجعة، الفريمات، التايم كود، الرسومات، درجات الألوان، الفويس نوت.
5. `client_shares`: روابط المراجعة السحرية للعملاء وصلاحياتهم.

### ج) تمكين التزامن اللحظي (Realtime Enablement):
يجب أن تكون الجداول التالية مضافة إلى منشور التزامن `supabase_realtime`:
```sql
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.cuts;
alter publication supabase_realtime add table public.notes;
```

### د) حاويات التخزين (Storage Buckets):
- `media-stills`: لتخزين لقطات الفريمات (Public Bucket).
- `media-drawings`: لتخزين رسومات الكانفاس (Public Bucket).
- `media-audio`: لتخزين الملاحظات الصوتية (Public Bucket).

### هـ) كود SQL الكامل لقاعدة البيانات:
الملف موجود وجاهز في المشروع تحت اسم:
`supabase_schema.sql`  
*(يمكن نسخه وتنفيذه في Supabase Dashboard -> SQL Editor بنقرة واحدة عند إعداد مشروع جديد).*

---

## ⚡ 6. إعدادات Vercel (Deployment Configuration)

- **Framework Preset**: Next.js
- **Node.js Version**: 20.x أو 22.x
- **Build Command**: `next build` (أو `npm run build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Root Directory**: `./` (المسار الرئيسي)
- **Environment Variables على Vercel**:
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://ygdqiuvysbkcdnoxjgxv.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_rb2otWUPrMU6UzvR1PDJQg_hNasGrv8`

> 💡 **ملاحظة**: بمجرد عمل `git push origin main`، يقوم Vercel بعمل Build و Deploy تلقائي خلال 40 ثانية.

---

## 💻 7. خطوات التشغيل على جهاز جديد من الصفر (Step-by-Step Setup)

اتبع هذه الخطوات البسيطة على جهازك الجديد:

### الخطوة 1: التأكد من تثبيت البرامج المطلوبة
- **Node.js**: الإصدار 18 أو 20 أو أحدث ([تحميل Node.js](https://nodejs.org/))
- **Git**: ([تحميل Git](https://git-scm.com/))

### الخطوة 2: استنساخ المشروع من GitHub
افتح الـ Terminal (أو PowerShell / CMD) واكتب:
```bash
git clone https://github.com/nobies/Augmentoria.git
cd Augmentoria
```

### الخطوة 3: تثبيت الحزم والمكتبات (Dependencies)
```bash
npm install
```

### الخطوة 4: إنشاء ملف المتغيرات البيئية (`.env.local`)
أنشئ ملف باسم `.env.local` في الفولدر الرئيسي، وأضف بداخله:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ygdqiuvysbkcdnoxjgxv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_rb2otWUPrMU6UzvR1PDJQg_hNasGrv8
```

### الخطوة 5: تشغيل المشروع محلياً (Local Development Server)
```bash
npm run dev
```
افتح المتصفح على الرابط:
👉 `http://localhost:3000`

### الخطوة 6: اختبار البناء للإنتاج (Production Build Test)
```bash
npm run build
```
*(يجب أن ينتهي بدون أي أخطاء `Exit code 0` لجميع الـ 12 route).*

---

## 🗺️ 8. خريطة مسارات المنصة (App Routes Map)

| المسار | الصفحة / الوظيفة |
|---|---|
| `/` | الصفحة الترويجية الرئيسية (Marketing Landing Page) |
| `/login` | بوابة تسجيل الدخول وتبديل الحسابات |
| `/dashboard` | لوحة التحكم، الإحصائيات، ومتابعة المشاريع |
| `/projects` | دليل المشاريع وفلاتر الحالات (Review, Approved, Delivered) |
| `/projects/[id]` | تفاصيل مشروع محدد وأصوله |
| `/clients` | نظام إدارة العملاء والشركات (CRM) |
| `/team` | إدارة أعضاء الفريق وتوزيع الصلاحيات |
| `/screener` | استوديو فحص ومراجعة الفيديو، التايم كود، الرسم، المقارنة، وتصحيح الألوان |
| `/review/[token]` | بوابة مراجعة العميل عبر الروابط السحرية السريعة |

---

## 🛠️ 9. نصائح وإرشادات سريعة (Troubleshooting)

1. **إذا واجهت مشكلة في الكاش بعد التحديث**:
   - اضغط `Ctrl + Shift + R` في المتصفح لعمل Hard Refresh.
2. **لتنظيف الكاش المحلي في بيئة التطوير**:
   ```bash
   # حذف مجلد البناء المؤقت
   rm -rf .next
   # تشغيل السيرفر من جديد
   npm run dev
   ```
3. **إذا أردت فحص حالة Git والتأكد من المزامنة**:
   ```bash
   git status
   git pull origin main
   ```
