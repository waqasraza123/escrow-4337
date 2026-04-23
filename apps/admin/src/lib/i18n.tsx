'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  defaultLocale,
  getLocaleDefinition,
  persistLocaleCookie,
  resolveSupportedLocale,
  syncDocumentLocale,
  type LocaleContextValue,
  type SupportedLocale,
} from '@escrow4334/frontend-core';

const adminMessages = {
  en: {
    languageName: 'English',
    languageNativeName: 'English',
    common: {
      brand: 'Milestone Escrow Operator',
      currentLanguage: 'Language',
      theme: 'Theme',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      loading: 'Loading',
      unavailable: 'Unavailable',
      unknown: 'Unknown',
      signedOut: 'Signed out',
      authenticated: 'Authenticated',
      yes: 'Yes',
      no: 'No',
    },
    landing: {
      topBar: {
        label: 'Milestone Escrow',
        meta:
          'Client-facing entry for escrow-first hiring, while operator tools stay under the dedicated operator route family.',
      },
      operatorAccess: 'Operator access',
      hero: {
        eyebrow: 'Escrow-first hiring on Base',
        title: 'Launch client work from a product landing, not an operator console.',
        copy:
          'Open the marketplace, move into milestone-funded work, and keep dispute resolution, moderation, and operations tooling behind the dedicated operator surface.',
        stats: [
          { label: 'Settlement rail', value: 'Base + USDC milestones' },
          { label: 'Hiring posture', value: 'Decision-ready briefs' },
          { label: 'Trust layer', value: 'Operator-reviewed disputes' },
          { label: 'Workflow', value: 'Marketplace to escrow handoff' },
        ],
      },
      value: {
        eyebrow: 'Why teams use it',
        title: 'Structured hiring with escrow discipline built in',
        cards: [
          {
            title: 'Publish work with clear outcomes',
            body:
              'Briefs stay scoped around deliverables, acceptance criteria, and milestone funding instead of open-ended bidding noise.',
          },
          {
            title: 'Move strong fits into escrow fast',
            body:
              'The product already bridges shortlist and hire decisions into the escrow flow without asking clients to rebuild context.',
          },
          {
            title: 'Keep trust and resolution operational',
            body:
              'Disputes, moderation, and workflow health still exist, but they live behind operator-only entry points instead of the public root.',
          },
        ],
      },
      workflow: {
        eyebrow: 'Hiring flow',
        title: 'How the client path works',
        steps: [
          {
            title: '1. Browse or publish',
            body:
              'Open the marketplace to review talent supply or move directly into a structured brief when you already know the work to ship.',
          },
          {
            title: '2. Select the strongest fit',
            body:
              'Evaluate applicants and move the selected engagement into the escrow-backed contract flow instead of managing a side channel.',
          },
          {
            title: '3. Deliver and settle with auditability',
            body:
              'Milestone delivery, release, dispute, and final resolution remain visible through the platform instead of disappearing into manual follow-up.',
          },
        ],
      },
      trust: {
        eyebrow: 'Trust and safety',
        title: 'Client-facing confidence without public diagnostics noise',
        copy:
          'The operator stack still handles moderation, support, dispute review, chain-sync posture, and reconciliation tooling. The public landing only explains the product posture that clients need to understand.',
        points: [
          {
            title: 'Operator review stays available',
            body:
              'Dedicated operator routes still own dispute review, moderation, and operations health when intervention is required.',
          },
          {
            title: 'Escrow state stays auditable',
            body:
              'Milestone funding and settlement stay grounded in the same API and escrow contracts already used by the operator workflows.',
          },
        ],
      },
      cta: {
        eyebrow: 'Start',
        title: 'Choose the product path that fits the current job',
        copy:
          'Use the main product surface for browsing, authentication, and direct escrow authoring. Use operator access only when you need the internal queue.',
        marketplace: 'Browse marketplace',
        signIn: 'Open workspace sign-in',
        startEscrow: 'Start a direct escrow',
      },
    },
    topBar: {
      label: 'Bilingual operator UI',
      meta:
        'Arabic uses full RTL direction while audit values, hashes, and JSON remain LTR.',
    },
    labels: {
      runtimeProfile: {
        'deployment-like': 'Deployment-like',
        'local-mock': 'Local mock',
        mixed: 'Mixed',
      },
      pressure: {
        stable: 'Stable',
        attention: 'Attention',
        critical: 'Critical',
      },
      posture: {
        stable: 'Stable',
        review: 'Review',
        resolved: 'Resolved',
      },
      timelineTone: {
        neutral: 'Neutral',
        warning: 'Warning',
        critical: 'Critical',
        success: 'Success',
      },
    },
    frame: {
      dashboard: {
        eyebrow: 'Operator Console',
        title: 'Run the operator queue from one dedicated home.',
        copy:
          'Use the operator route to restore session authority, review cross-job attention, open case work, and reach moderation without treating raw runtime diagnostics as the headline content.',
      },
      case: {
        eyebrow: 'Operator Case',
        title: 'Resolve one milestone dispute from the visible case history.',
        copy:
          'This route stays focused on one contract: milestone posture, delivery evidence, dispute evidence, receipts, timeline, and final operator resolution.',
      },
    },
    case: {
      whatThisSurfaceCanReview: 'What this surface can review today',
      disputeReview: 'Dispute review',
      receiptTriage: 'Receipt triage',
      publicOnlyPosture: 'Public-only posture',
      emptyLoad:
        'Load a public job bundle to review milestone disputes, reasons, and current settlement posture.',
      noDisputedMilestones:
        'This public bundle does not currently show any disputed milestones.',
      resolutionBlocked:
        'Privileged resolution is only actionable when the current bundle still shows a disputed milestone.',
      milestoneAttention: 'Milestones needing operator attention',
      failuresAndReceipts: 'Failures and receipt posture',
      milestoneBoard: 'Operator-readable milestone board',
      timeline: 'Combined operator timeline',
      resolveMilestone: 'Resolve disputed milestone',
    },
    helperCopy: {
      disputesAndFailures:
        'Disputes and failed executions are both present. This case needs operator attention first.',
      disputesOnly:
        'At least one milestone is disputed. Review evidence, timeline, and the acting wallet posture.',
      failuresOnly:
        'Execution failures are present. Inspect receipts before assuming the case is blocked by participants.',
      activeNoEscalation:
        'The case is active but not escalated. Watch delivery and release posture for the next change.',
      noPressure:
        'No disputes or failed executions are visible in the public audit trail.',
      disputeReviewRequired: 'Dispute review required',
      deliveredAwaitingClient: 'Delivered and awaiting client action',
      noEscalationVisible: 'No escalation visible',
      settledRelease: 'Settled in favor of release',
      settledRefund: 'Settled in favor of refund',
      resolvedWith: (action: string) => `Resolution action recorded as ${action}.`,
      settledFallback: 'This milestone is fully settled.',
      deliveryAwaitingFallback:
        'Delivery evidence is present, but release or dispute has not yet closed the milestone.',
      disputeReasonFallback:
        'A dispute exists, but the public audit payload did not include a typed reason.',
      pendingFallback:
        'The milestone is still pending and has not entered the dispute path.',
      executionFailed: 'Execution failed',
      executionConfirmed: 'Confirmed execution',
      executionFailureFallback:
        'The public receipt marks this execution as failed without a richer message.',
      auditFallback:
        'Public audit activity is visible for this case.',
      executionFallback:
        'Execution activity is visible for this case.',
    },
  },
  ar: {
    languageName: 'Arabic',
    languageNativeName: 'العربية',
    common: {
      brand: 'مشغّل ضمان المراحل',
      currentLanguage: 'اللغة',
      theme: 'السمة',
      lightTheme: 'فاتح',
      darkTheme: 'داكن',
      loading: 'جاري التحميل',
      unavailable: 'غير متاح',
      unknown: 'غير معروف',
      signedOut: 'تم تسجيل الخروج',
      authenticated: 'تم تسجيل الدخول',
      yes: 'نعم',
      no: 'لا',
    },
    landing: {
      topBar: {
        label: 'ضمان المراحل',
        meta:
          'مدخل موجه للعملاء للتوظيف القائم على الضمان، بينما تبقى أدوات المشغّل داخل مسارات المشغّل المخصصة.',
      },
      operatorAccess: 'دخول المشغّل',
      hero: {
        eyebrow: 'توظيف قائم على الضمان فوق Base',
        title: 'ابدأ مسار العميل من صفحة منتج، لا من لوحة تشغيل داخلية.',
        copy:
          'افتح السوق، وانتقل إلى العمل الممول بالمراحل، مع إبقاء حل النزاعات والإشراف والأدوات التشغيلية خلف واجهة المشغّل المخصصة.',
        stats: [
          { label: 'مسار التسوية', value: 'Base + USDC بالمراحل' },
          { label: 'وضع التوظيف', value: 'موجزات جاهزة للقرار' },
          { label: 'طبقة الثقة', value: 'نزاعات يراجعها المشغّل' },
          { label: 'سير العمل', value: 'انتقال من السوق إلى الضمان' },
        ],
      },
      value: {
        eyebrow: 'لماذا تستخدمه الفرق',
        title: 'توظيف منظم مع انضباط الضمان مدمجاً',
        cards: [
          {
            title: 'انشر عملاً بنتائج واضحة',
            body:
              'تبقى الموجزات مركزة على المخرجات ومعايير القبول وتمويل المراحل بدلاً من فوضى المزايدات المفتوحة.',
          },
          {
            title: 'انقل أفضل المرشحين إلى الضمان بسرعة',
            body:
              'يربط المنتج بالفعل بين قرارات الاختيار والتوظيف وبين تدفق الضمان من دون مطالبة العميل بإعادة بناء السياق.',
          },
          {
            title: 'أبقِ الثقة والحسم في المسار التشغيلي',
            body:
              'لا تزال النزاعات والإشراف وصحة التشغيل موجودة، لكنها تعيش خلف نقاط دخول خاصة بالمشغّل بدلاً من الجذر العام.',
          },
        ],
      },
      workflow: {
        eyebrow: 'مسار التوظيف',
        title: 'كيف يعمل مسار العميل',
        steps: [
          {
            title: '1. تصفح أو انشر',
            body:
              'افتح السوق لمراجعة العرض المتاح أو انتقل مباشرة إلى موجز منظم عندما تعرف العمل المطلوب شحنه.',
          },
          {
            title: '2. اختر الأنسب',
            body:
              'قيّم المتقدمين وانقل التعاقد المختار إلى تدفق عقد مدعوم بالضمان بدلاً من إدارة قنوات جانبية.',
          },
          {
            title: '3. سلّم وسوِّ مع قابلية للتدقيق',
            body:
              'يبقى التسليم والإفراج والنزاع والحسم النهائي للمراحل ظاهراً عبر المنصة بدلاً من أن يضيع في المتابعة اليدوية.',
          },
        ],
      },
      trust: {
        eyebrow: 'الثقة والسلامة',
        title: 'ثقة موجهة للعميل بدون ضجيج تشخيصي علني',
        copy:
          'لا تزال طبقة المشغّل تتولى الإشراف والدعم ومراجعة النزاعات ووضع مزامنة السلسلة وأدوات المطابقة. صفحة الهبوط العامة تشرح فقط الوضع الذي يحتاج العميل إلى فهمه.',
        points: [
          {
            title: 'مراجعة المشغّل تبقى متاحة',
            body:
              'لا تزال مسارات المشغّل المخصصة تملك مراجعة النزاعات والإشراف وصحة التشغيل عندما تكون هناك حاجة إلى تدخل.',
          },
          {
            title: 'حالة الضمان تبقى قابلة للتدقيق',
            body:
              'يبقى تمويل المراحل وتسويتها مستندين إلى نفس الـ API وعقود الضمان المستخدمة بالفعل في مسارات المشغّل.',
          },
        ],
      },
      cta: {
        eyebrow: 'ابدأ',
        title: 'اختر مسار المنتج المناسب لهذه المهمة',
        copy:
          'استخدم سطح المنتج الرئيسي للتصفح والتسجيل وتأليف الضمان المباشر. استخدم دخول المشغّل فقط عندما تحتاج إلى الصف الداخلي.',
        marketplace: 'تصفح السوق',
        signIn: 'افتح تسجيل الدخول',
        startEscrow: 'ابدأ ضماناً مباشراً',
      },
    },
    topBar: {
      label: 'واجهة مشغّل ثنائية اللغة',
      meta:
        'العربية تستخدم اتجاه RTL كامل بينما تبقى قيم التدقيق والتجزئات وJSON في اتجاه LTR.',
    },
    labels: {
      runtimeProfile: {
        'deployment-like': 'مشابه للنشر',
        'local-mock': 'محلي تجريبي',
        mixed: 'مختلط',
      },
      pressure: {
        stable: 'مستقر',
        attention: 'يتطلب انتباهاً',
        critical: 'حرج',
      },
      posture: {
        stable: 'مستقر',
        review: 'مراجعة',
        resolved: 'محسوم',
      },
      timelineTone: {
        neutral: 'محايد',
        warning: 'تحذير',
        critical: 'حرج',
        success: 'نجاح',
      },
    },
    frame: {
      dashboard: {
        eyebrow: 'لوحة المشغّل',
        title: 'أدر صفوف المشغّل من صفحة رئيسية مخصصة.',
        copy:
          'استخدم مسار المشغّل لاستعادة صلاحية الجلسة، ومراجعة الانتباه عبر الوظائف، وفتح القضايا، والوصول إلى الإشراف، من دون جعل تشخيصات التشغيل الخام هي المحتوى الرئيسي.',
      },
      case: {
        eyebrow: 'قضية المشغّل',
        title: 'احسم نزاع مرحلة واحدة من سجل القضية الظاهر.',
        copy:
          'يبقى هذا المسار مركزاً على عقد واحد: وضع المرحلة، أدلة التسليم، أدلة النزاع، الإيصالات، الخط الزمني، والحسم النهائي للمشغّل.',
      },
    },
    case: {
      whatThisSurfaceCanReview: 'ما الذي يمكن لهذه الواجهة مراجعته اليوم',
      disputeReview: 'مراجعة النزاع',
      receiptTriage: 'فرز الإيصالات',
      publicOnlyPosture: 'وضع عام فقط',
      emptyLoad:
        'قم بتحميل حزمة عقد عامة لمراجعة نزاعات المراحل والأسباب ووضع التسوية الحالي.',
      noDisputedMilestones:
        'لا تعرض هذه الحزمة العامة حالياً أي مراحل متنازع عليها.',
      resolutionBlocked:
        'لا يصبح الحسم المميز قابلاً للتنفيذ إلا عندما تعرض الحزمة الحالية مرحلة متنازعاً عليها.',
      milestoneAttention: 'المراحل التي تحتاج إلى انتباه المشغّل',
      failuresAndReceipts: 'الإخفاقات ووضع الإيصالات',
      milestoneBoard: 'لوحة مراحل قابلة لقراءة المشغّل',
      timeline: 'الخط الزمني الموحد للمشغّل',
      resolveMilestone: 'حسم المرحلة المتنازع عليها',
    },
    helperCopy: {
      disputesAndFailures:
        'توجد نزاعات وإخفاقات تنفيذ معاً. تحتاج هذه القضية إلى انتباه المشغّل أولاً.',
      disputesOnly:
        'هناك مرحلة واحدة على الأقل متنازع عليها. راجع الأدلة والخط الزمني ووضع المحفظة الفاعلة.',
      failuresOnly:
        'توجد إخفاقات تنفيذ. افحص الإيصالات قبل افتراض أن القضية محجوبة من المشاركين.',
      activeNoEscalation:
        'القضية نشطة ولكنها غير مصعّدة. راقب وضع التسليم والإفراج للتغيير القادم.',
      noPressure:
        'لا توجد نزاعات أو إخفاقات تنفيذ ظاهرة في سجل التدقيق العام.',
      disputeReviewRequired: 'مراجعة النزاع مطلوبة',
      deliveredAwaitingClient: 'تم التسليم بانتظار إجراء العميل',
      noEscalationVisible: 'لا يوجد تصعيد ظاهر',
      settledRelease: 'تمت التسوية لصالح الإفراج',
      settledRefund: 'تمت التسوية لصالح الاسترداد',
      resolvedWith: (action: string) => `تم تسجيل إجراء الحسم كـ ${action}.`,
      settledFallback: 'تمت تسوية هذه المرحلة بالكامل.',
      deliveryAwaitingFallback:
        'توجد أدلة تسليم، لكن الإفراج أو النزاع لم يغلق المرحلة بعد.',
      disputeReasonFallback:
        'يوجد نزاع، لكن حمولة التدقيق العامة لم تتضمن سبباً منظماً.',
      pendingFallback:
        'لا تزال المرحلة معلقة ولم تدخل مسار النزاع بعد.',
      executionFailed: 'فشل التنفيذ',
      executionConfirmed: 'تنفيذ مؤكد',
      executionFailureFallback:
        'تشير الإيصالات العامة إلى فشل التنفيذ بدون رسالة أوضح.',
      auditFallback:
        'يوجد نشاط تدقيق عام ظاهر لهذه القضية.',
      executionFallback:
        'يوجد نشاط تنفيذ ظاهر لهذه القضية.',
    },
  },
} as const;

export type AdminMessages = (typeof adminMessages)[typeof defaultLocale];
type AdminLocaleContextValue = LocaleContextValue<AdminMessages>;

const AdminI18nContext = createContext<AdminLocaleContextValue | null>(null);

export function getAdminMessages(locale: SupportedLocale): AdminMessages {
  return adminMessages[locale];
}

export function AdminI18nProvider(props: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const { children, initialLocale = defaultLocale } = props;
  const [locale, setLocale] = useState<SupportedLocale>(
    resolveSupportedLocale(initialLocale),
  );

  useEffect(() => {
    syncDocumentLocale(locale);
    persistLocaleCookie(locale);
  }, [locale]);

  const value = useMemo<AdminLocaleContextValue>(() => {
    const resolvedLocale = resolveSupportedLocale(locale);

    return {
      locale: resolvedLocale,
      definition: getLocaleDefinition(resolvedLocale),
      messages: getAdminMessages(resolvedLocale),
      setLocale,
    };
  }, [locale]);

  return (
    <AdminI18nContext.Provider value={value}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const value = useContext(AdminI18nContext);

  if (!value) {
    throw new Error('useAdminI18n must be used within AdminI18nProvider.');
  }

  return value;
}
