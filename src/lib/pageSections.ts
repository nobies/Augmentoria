import type { Collection } from './idb';

export interface LText {
  en: string;
  ar: string;
}

export type SectionType = 'split' | 'features' | 'steps' | 'showcase' | 'team' | 'cta';

export const SECTION_TYPES: SectionType[] = ['split', 'features', 'steps', 'showcase', 'team', 'cta'];

export const PAGE_IMAGES_COLLECTION: Collection = 'page';

export interface SectionItem {
  title?: LText;
  desc?: LText;
  imageId?: string;
}

export interface SectionData {
  title?: LText;
  subtitle?: LText;
  body?: LText;
  bullets?: LText[];
  items?: SectionItem[];
  imageId?: string;
  reverse?: boolean;
  ctaLabel?: LText;
}

export interface LandingSection {
  id: string;
  type: SectionType;
  visible: boolean;
  data: SectionData;
}

const l = (en: string, ar: string): LText => ({ en, ar });

export const DEFAULT_SECTIONS: LandingSection[] = [
  {
    id: 's-about',
    type: 'split',
    visible: true,
    data: {
      title: l('One workspace for the whole delivery cycle.', 'مساحة واحدة لدورة التسليم كاملة.'),
      subtitle: l('From upload to approval.', 'من الرفع لحد الاعتماد.'),
      body: l(
        'Augmentoria keeps versions, feedback, annotations and reports together — so nothing gets lost between the editor and the client.',
        'أوجمنتوريا بتجمع النسخ والملاحظات والرسومات والتقارير في مكان واحد — عشان مفيش حاجة تضيع بين المونتير والعميل.'
      ),
      bullets: [
        l('Version management with approvals', 'إدارة نسخ مع اعتمادات رسمية'),
        l('Frame & range comments', 'تعليقات على فريمات ومجالات'),
        l('Visual annotation layers over video', 'طبقات رسم ونصوص فوق الفيديو'),
        l('Screener-style PDF reports', 'تقارير PDF احترافية')
      ],
      imageId: undefined,
      reverse: false
    }
  },
  {
    id: 's-features',
    type: 'features',
    visible: true,
    data: {
      title: l('Everything your pipeline needs.', 'كل ما يحتاجه خط شغلك.'),
      subtitle: l('Core capabilities', 'القدرات الأساسية'),
      items: [
        {
          title: l('Versions & Approvals', 'نسخ واعتمادات'),
          desc: l('Every export becomes a version with full history and a recorded client sign-off.', 'كل تصدير بيبقى نسخة ليها تاريخ كامل واعتماد مسجل من العميل.')
        },
        {
          title: l('Frame & Range Notes', 'ملاحظات فريم ومجال'),
          desc: l('Pin comments to an exact frame or a time range — context is never lost.', 'علّق على فريم محدد أو جزء من الزمن — السياق عمره ما بيضيع.')
        },
        {
          title: l('Annotation Layers', 'طبقات توضيحية'),
          desc: l('Draw, write and place images over the video as controllable layers.', 'ارسم واكتب وحط صور فوق الفيديو كطبقات بتتحكم فيها.')
        },
        {
          title: l('Review Reports', 'تقارير مراجعة'),
          desc: l('Export complete reports with annotated frames for every comment.', 'اطلع تقارير كاملة بصورة الفريم لكل تعليق.')
        }
      ]
    }
  },
  {
    id: 's-steps',
    type: 'steps',
    visible: true,
    data: {
      title: l('How it works.', 'بتشتغل إزاي.'),
      subtitle: l('The workflow', 'طريقة العمل'),
      items: [
        { title: l('Upload', 'ارفع'), desc: l('Editor uploads the finished version.', 'المونتير يرفع النسخة الجاهزة.') },
        { title: l('Review', 'راجع'), desc: l('Client watches and annotates frame-by-frame.', 'العميل يشاهد ويعلق فريم بفريم.') },
        { title: l('Revise', 'عدّل'), desc: l('Notes become clear visual tasks.', 'الملاحظات بتبقى مهام بصرية واضحة.') },
        { title: l('Deliver', 'سلّم'), desc: l('Approval locks the version and generates the report.', 'الاعتماد يقفل النسخة ويطلع التقرير.') }
      ]
    }
  },
  {
    id: 's-showcase',
    type: 'showcase',
    visible: true,
    data: {
      title: l('Made for studios & agencies.', 'مصمم للاستوديوهات والوكالات.'),
      subtitle: l('Who it serves', 'لمين'),
      items: [
        { title: l('Ad Agencies', 'وكالات إعلان'), desc: l('Client reviews without WhatsApp chaos.', 'عميلك يراجع من غير فوضى الواتساب.') },
        { title: l('Production Houses', 'شركات إنتاج'), desc: l('Organize projects, teams and deliveries.', 'نظم مشاريعك وفريقك وتسليماتك.') },
        { title: l('Freelance Editors', 'مونترين مستقلين'), desc: l('Look professional from first link to final report.', 'بان احترافي من أول لينك لآخر تقرير.') }
      ]
    }
  },
  {
    id: 's-cta',
    type: 'cta',
    visible: true,
    data: {
      title: l('Ready to sync your post-production?', 'جاهز تزامن مرحلة ما بعد الإنتاج؟'),
      body: l('Set up your studio in minutes. No credit card required.', 'جهز استوديوك في دقايق. من غير بطاقة ائتمان.'),
      ctaLabel: l('Start your studio', 'ابدأ استوديوك')
    }
  }
];

export const STORAGE_KEY = 'landing-sections-v1';
