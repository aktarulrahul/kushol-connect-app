// Demo copy for the dev-only UI kit (/dev/ui). Clearly fictional — "Demo High School", "Demo
// Student" — never a real school, person or figure (prompt.txt §12). Not reachable in release
// builds (the route redirects outside __DEV__).
import type { Locale } from "@/i18n";

/** Bengali rendering specimen (DSN-US-003): conjuncts, vowel signs, numerals, mixed lines. */
export const specimen = {
  conjuncts: "ক্ষ জ্ঞ ঙ্ক ষ্ণ স্ত্র র্ক ন্দ্র শ্ব হ্ম ক্ত্র",
  vowelSigns: "কি কী কু কূ কৃ কে কৈ কো কৌ কং কঃ কঁ",
  numerals: "০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯",
  mixed: "Class 10-এর বিজ্ঞান শাখার নোটিশ — Demo High School, রোল ২৩",
  paragraph:
    "আগামী রবিবার সকাল ৯টায় দশম শ্রেণির বিজ্ঞান শাখার অভিভাবক সভা অনুষ্ঠিত হবে। এটি নমুনা লেখা — বাস্তব কোনো বিদ্যালয়ের নোটিশ নয়।",
};

/** bn deliberately ~30% longer than en to test wrapping (DSN-UT-004). */
export const demoCopy = {
  longAction: {
    bn: "বিদ্যালয়ের সব অভিভাবককে জরুরি বিজ্ঞপ্তি পাঠান",
    en: "Send urgent notice to all guardians",
  },
  dialogTitle: { bn: "নোটিশটি মুছে ফেলবেন?", en: "Delete this notice?" },
  dialogBody: {
    bn: "মুছে ফেললে শিক্ষার্থী ও অভিভাবকেরা আর নোটিশটি দেখতে পাবেন না। এটি ফেরানো যাবে না।",
    en: "Students and guardians will no longer see this notice. This can't be undone.",
  },
  schoolName: { bn: "ডেমো হাই স্কুল", en: "Demo High School" },
  sectionGroup: { bn: "দশম শ্রেণি · বিজ্ঞান (ডেমো)", en: "Class 10 · Science (demo)" },
  noticeTitle: { bn: "অভিভাবক সভার নোটিশ", en: "Guardian meeting notice" },
  lastMessage: { bn: "নমুনা শিক্ষক: আগামীকাল ক্লাস হবে", en: "Demo Teacher: Class is on tomorrow" },
  fieldName: { bn: "শিক্ষার্থীর নাম", en: "Student name" },
  fieldPhone: { bn: "অভিভাবকের মোবাইল নম্বর", en: "Guardian's mobile number" },
  fieldPhoneHelp: {
    bn: "এই নম্বরে লগইনের জন্য একটি কোড পাঠানো হবে",
    en: "We'll send a sign-in code to this number",
  },
  fieldMessage: { bn: "বার্তা", en: "Message" },
  fieldNotify: {
    bn: "অভিভাবকদের পুশ নোটিফিকেশন পাঠান",
    en: "Send push notifications to guardians",
  },
  fieldSection: { bn: "শাখা", en: "Section" },
  otp: { bn: "যাচাই কোড", en: "Verification code" },
  pending: { bn: "অপেক্ষমাণ", en: "Pending" },
  toastSaved: { bn: "নোটিশ সংরক্ষণ করা হয়েছে", en: "Notice saved" },
  toastFailed: { bn: "নোটিশ পাঠানো যায়নি", en: "Notice failed to send" },
  filterAll: { bn: "সব", en: "All" },
  filterOfficial: { bn: "অফিসিয়াল", en: "Official" },
  filterClubs: { bn: "ক্লাব", en: "Clubs" },
  filterDms: { bn: "ডিএম", en: "DMs" },
  tabChat: { bn: "চ্যাট", en: "Chat" },
  tabNotices: { bn: "নোটিশ", en: "Notices" },
  newMessage: { bn: "নতুন বার্তা", en: "New message" },
  fee: { bn: "মাসিক ফি", en: "Monthly fee" },
  amount: { bn: "পরিমাণ", en: "Amount" },
} as const satisfies Record<string, Record<Locale, string>>;

export function pick(locale: Locale, copy: Readonly<Record<Locale, string>>): string {
  return copy[locale];
}
