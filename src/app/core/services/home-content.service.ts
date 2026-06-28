import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { HomeContent } from '../models';

/**
 * المحتوى الافتراضي للصفحة الرئيسية = نفس القيم المكتوبة سابقاً في القالب،
 * حتى تظهر الصفحة كما هي قبل أي تعديل من الأدمن (هجرة بلا انقطاع).
 */
export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroStats: [
    { value: '7,730', label: 'نسمة' },
    { value: '1,954', label: 'أسرة' },
    { value: '3', label: 'دورات مسابقة' },
  ],
  news: [
    {
      id: 'n1', tag: 'مشاريع',
      title: 'افتتاح مشروع تطوير شبكة الصرف الصحي',
      body: 'أُعلن عن افتتاح المرحلة الأولى من مشروع تطوير وتحديث شبكة الصرف الصحي بالقرية، بتكلفة تجاوزت مليوني جنيه مصري.',
      date: new Date('2026-06-10'),
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1c5508df4-1773054348045.png',
    },
    {
      id: 'n2', tag: 'تعليم',
      title: 'توزيع مستلزمات المدارس على أبناء القرية',
      body: 'نظّم مجلس القرية حملة لتوزيع الأدوات والمستلزمات المدرسية على أبناء الأسر المحتاجة استعداداً للعام الدراسي الجديد.',
      date: new Date('2026-06-05'),
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1e3a37a89-1777066769040.png',
    },
    {
      id: 'n3', tag: 'مسابقة',
      title: 'انطلاق مسابقة القرآن الكريم السنوية الثالثة',
      body: 'أطلقت القرية رسمياً باب التسجيل في الدورة الثالثة من مسابقة حفظ وتجويد القرآن الكريم بمشاركة واسعة من أبناء القرية.',
      date: new Date('2026-06-01'),
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_154c631e2-1764906424023.png',
    },
  ],
  figures: [
    { id: 'f1', name: 'الشيخ محمد أبو الحسن', role: 'عالم دين', photo: 'https://img.rocket.new/generatedImages/rocket_gen_img_1d7668ed1-1773081462994.png' },
    { id: 'f2', name: 'د. أحمد السيد', role: 'طبيب وباحث', photo: 'https://img.rocket.new/generatedImages/rocket_gen_img_1b7789841-1772146118066.png' },
    { id: 'f3', name: 'المهندس خالد عبد الرحمن', role: 'مهندس معماري', photo: 'https://img.rocket.new/generatedImages/rocket_gen_img_1f45cccaf-1763296121464.png' },
    { id: 'f4', name: 'الأستاذ عمر الشريف', role: 'معلم ومربي', photo: 'https://img.rocket.new/generatedImages/rocket_gen_img_1c7d0ead4-1763299484523.png' },
  ],
  services: [
    { id: 's1', icon: '🏥', title: 'الخدمات الصحية', desc: 'وحدة صحية متكاملة لخدمة أبناء القرية وتقديم الرعاية الطبية الأساسية' },
    { id: 's2', icon: '📚', title: 'التعليم', desc: 'مدارس ابتدائية وإعدادية وثانوية توفر تعليماً متميزاً لأبناء القرية' },
    { id: 's3', icon: '🕌', title: 'الشؤون الدينية', desc: 'مساجد ومراكز تحفيظ القرآن الكريم لخدمة الحياة الروحية للمجتمع' },
    { id: 's4', icon: '🏗️', title: 'مشاريع التطوير', desc: 'مشاريع البنية التحتية والتطوير العمراني لرفع مستوى المعيشة' },
    { id: 's5', icon: '👨‍👩‍👧‍👦', title: 'الشؤون الاجتماعية', desc: 'دعم الأسر المحتاجة والمبادرات الاجتماعية لتعزيز التكافل المجتمعي' },
    { id: 's6', icon: '🌾', title: 'الزراعة', desc: 'دعم المزارعين وتطوير القطاع الزراعي لتعزيز الاكتفاء الذاتي' },
  ],
  obituaries: [
    { id: 'o1', name: 'الحاج محمود عبد الله', text: 'توفي إلى رحمة الله عن عمر ناهز 78 عاماً، بعد مسيرة حافلة بالعطاء والخدمة لأبناء قريته.', date: new Date('2026-06-12') },
    { id: 'o2', name: 'السيدة فاطمة حسن', text: 'انتقلت إلى رحمة الله بعد مسيرة حافلة بالعطاء والتضحية، وتركت أثراً طيباً في قلوب من عرفوها.', date: new Date('2026-06-08') },
    { id: 'o3', name: 'الشيخ إبراهيم الصاوي', text: 'فقدت القرية أحد أعلامها وحفاظ القرآن الكريم، رحمه الله وأسكنه فسيح جناته.', date: new Date('2026-06-03') },
  ],
};

/** محتوى الصفحة الرئيسية (/siteContent/home) — قابل للتعديل من لوحة الأدمن. */
@Injectable({ providedIn: 'root' })
export class HomeContentService {
  private fs = inject(Firestore);
  private ref = doc(this.fs, 'siteContent/home');

  /** يدمج محتوى Firestore فوق القيم الافتراضية (كل قسم على حدة). */
  watch(): Observable<HomeContent> {
    return (docData(this.ref) as Observable<Partial<HomeContent> | undefined>).pipe(
      map((d) => ({
        heroStats:  d?.heroStats  ?? DEFAULT_HOME_CONTENT.heroStats,
        news:       d?.news        ?? DEFAULT_HOME_CONTENT.news,
        figures:    d?.figures     ?? DEFAULT_HOME_CONTENT.figures,
        services:   d?.services    ?? DEFAULT_HOME_CONTENT.services,
        obituaries: d?.obituaries  ?? DEFAULT_HOME_CONTENT.obituaries,
      })),
    );
  }

  async update(patch: Partial<HomeContent>): Promise<void> {
    await setDoc(this.ref, patch, { merge: true });
  }
}
