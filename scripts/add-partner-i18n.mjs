import fs from 'node:fs';
import path from 'node:path';

const enPath = path.resolve('src/i18n/en.json');
const bnPath = path.resolve('src/i18n/bn.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const bn = JSON.parse(fs.readFileSync(bnPath, 'utf8'));

const newKeys = {
  "admin.role.partner_admin": {
    en: "Partner Admin",
    bn: "পার্টনার অ্যাডমিন"
  },
  "admin.role.partner_executive": {
    en: "Partner Executive",
    bn: "পার্টনার এক্সিকিউটিভ"
  },
  "errors.partner_approval_pending": {
    en: "Partner account is pending approval by Kushol Super Admin.",
    bn: "পার্টনার অ্যাকাউন্টটি কুশল সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে।"
  },
  "errors.partner_rejected": {
    en: "Partner application was rejected by Kushol administration.",
    bn: "পার্টনার আবেদনটি কুশল প্রশাসন কর্তৃক বাতিল করা হয়েছে।"
  },
  "auth.partner.register_title": {
    en: "Partner Self-Registration",
    bn: "পার্টনার সেলফ-রেজিস্ট্রেশন"
  },
  "auth.partner.register_subtitle": {
    en: "Register your educational brand or business for free. Submit KYC for Super Admin verification.",
    bn: "সম্পূর্ণ বিনামূল্যে আপনার শিক্ষামূলক প্রতিষ্ঠান বা ব্র্যান্ডের নিবন্ধন করুন এবং কেওয়াইসি জমা দিন।"
  },
  "auth.partner.free_badge": {
    en: "Registration is 100% Free",
    bn: "নিবন্ধন সম্পূর্ণ বিনামূল্যে"
  },
  "events.partner.volunteer_apply_title": {
    en: "Apply as Campaign Volunteer",
    bn: "ক্যাম্পেইন ভলান্টিয়ার হিসেবে আবেদন করুন"
  },
  "events.partner.volunteer_apply_body": {
    en: "Join this event team to gain leadership experience and earn XP rewards.",
    bn: "নেতৃত্বের অভিজ্ঞতা অর্জন করতে এবং এক্সপি রিওয়ার্ড পেতে এই ইভেন্ট টিমে যুক্ত হোন।"
  },
  "events.partner.volunteer_apply_btn": {
    en: "Submit Volunteer Application",
    bn: "ভলান্টিয়ার আবেদন জমা দিন"
  },
  "events.partner.my_tasks_title": {
    en: "My Volunteering & Tasks",
    bn: "আমার ভলান্টিয়ারিং ও দায়িত্ব"
  },
  "events.partner.claim_task_btn": {
    en: "Claim Task from Pool",
    bn: "পুল থেকে টাস্ক গ্রহণ করুন"
  },
  "events.partner.submit_proof_btn": {
    en: "Submit Task Execution Proof",
    bn: "টাস্ক সমাপ্তির প্রমাণ জমা দিন"
  },
  "events.partner.xp_reward_badge": {
    en: "+{xp} XP Reward",
    bn: "+{xp} এক্সপি রিওয়ার্ড"
  },
  "events.partner.certificate_verify": {
    en: "Tamper-Evident Verified Certificate",
    bn: "যাচাইকৃত ডিজিটাল সনদপত্র"
  }
};

for (const [key, val] of Object.entries(newKeys)) {
  en[key] = val.en;
  bn[key] = val.bn;
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(bnPath, JSON.stringify(bn, null, 2) + '\n', 'utf8');
console.log('Successfully updated en.json and bn.json in app with partner keys.');
