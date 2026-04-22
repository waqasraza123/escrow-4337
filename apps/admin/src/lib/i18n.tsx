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
        title: 'Review disputes and execution issues from the public audit trail.',
        copy:
          'This surface stays within the existing public audit endpoint. It is organized around operator tasks: dispute triage, receipt inspection, milestone posture review, and explicit visibility into what still requires backend authorization work.',
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
        title: 'راجع النزاعات ومشكلات التنفيذ من سجل التدقيق العام.',
        copy:
          'تبقى هذه الواجهة ضمن نقطة نهاية التدقيق العامة الحالية. وهي منظمة حول مهام المشغّل: فرز النزاعات، فحص الإيصالات، مراجعة وضع المراحل، وإظهار ما يزال يحتاج إلى عمل صلاحيات خلفي.',
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
