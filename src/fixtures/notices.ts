// ─── STAGE-2 NOTICES SEAM ─────────────────────────────────────────────────────────────────────
// Every notice call imports from this file ONLY (same swap story as chat.ts — one-file rewrite
// onto the generated client in Stage 5). Types from the spec; data clearly fictional.
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
export type Notice = Schemas["Notice"];
export type NoticeInput = Schemas["NoticeInput"];
export type NoticeScope = Schemas["NoticeScope"];

import { ChatFixtureError, DEMO_ME } from "@/fixtures/chat";

const iso = (minutesAgo: number): string =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString();

let seq = 0;

type NoticeRow = Notice;

/** Newest last; the board renders pinned-first then reverse-chronological. */
const NOTICES: NoticeRow[] = [
  {
    id: "ntc_demo_1",
    schoolId: DEMO_ME.schoolId,
    scope: "school",
    title: "অর্ধবার্ষিক পরীক্ষার রুটিন (ডেমো)",
    body: "আগামী রবিবার থেকে অর্ধবার্ষিক পরীক্ষা শুরু হবে। রুটিন ক্লাসরুম বোর্ডে টাঙানো আছে এবং সংযুক্ত পিডিএফেও পাওয়া যাচ্ছে। সবাই সময়মতো উপস্থিত থাকবে। (এটি নমুনা নোটিশ — বাস্তব কোনো বিদ্যালয়ের নয়।)",
    pinned: true,
    attachment: {
      assetId: "asset_demo_syllabus",
      kind: "pdf",
      mime: "application/pdf",
      sizeBytes: 842_133,
      fileName: "অর্ধবার্ষিক-রুটিন.pdf",
      status: "confirmed",
    },
    author: { userId: "user_demo_admin", name: "ডেমো প্রধান শিক্ষক", role: "school_admin" },
    publishedAt: iso(300),
  },
  {
    id: "ntc_demo_2",
    schoolId: DEMO_ME.schoolId,
    scope: "section",
    sectionId: "sec_10_a_demo_high",
    title: "ক্লাস টেস্ট — অধ্যায় ৪ (ডেমো)",
    body: "দশম শ্রেণি (বিজ্ঞান) শাখার আগামীকালের ক্লাস টেস্ট রসায়নের চতুর্থ অধ্যায় থেকে হবে। খাতা সঙ্গে আনতে ভুলবেন না।",
    pinned: false,
    author: { userId: DEMO_ME.userId, name: DEMO_ME.name, role: "teacher" },
    publishedAt: iso(95),
  },
  {
    id: "ntc_demo_3",
    schoolId: DEMO_ME.schoolId,
    scope: "school",
    title: "শীতকালীন খেলাধুলা (ডেমো)",
    body: "এই মাসের শেষ শুক্রবারে বার্ষিক ক্রীড়া প্রতিযোগিতা অনুষ্ঠিত হবে। যেসব শিক্ষার্থী অংশ নিতে চায় তারা শ্রেণিশিক্ষকের কাছে নাম জমা দেবে।",
    pinned: false,
    author: { userId: "user_demo_admin", name: "ডেমো প্রধান শিক্ষক", role: "school_admin" },
    publishedAt: iso(60 * 26),
  },
];

/** GET /notices — my school's board (+ my sections); pinned first, then newest first. */
export async function listNotices(scope?: NoticeScope): Promise<Notice[]> {
  await Promise.resolve();
  const visible = NOTICES.filter((n) => {
    if (scope && n.scope !== scope) return false;
    // Section notices are visible only to members of that section (the demo teacher teaches both).
    return true;
  });
  return visible
    .map((n) => ({ ...n }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

/** GET /notices/{id} — detail; a removed notice reads as gone (US-012 edge). */
export async function getNotice(noticeId: string): Promise<Notice | null> {
  await Promise.resolve();
  const notice = NOTICES.find((n) => n.id === noticeId);
  return notice ? { ...notice } : null;
}

/** POST /notices — role→scope matrix (INV-5): the demo teacher publishes section scope only. */
export async function publishNotice(input: NoticeInput): Promise<Notice> {
  await Promise.resolve();
  const notice: NoticeRow = {
     
    id: `ntc_demo_${String(++seq + 4)}`,
    schoolId: DEMO_ME.schoolId,
    scope: input.scope,
    ...(input.scope === "section" && input.sectionId ? { sectionId: input.sectionId } : {}),
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    author: { userId: DEMO_ME.userId, name: DEMO_ME.name, role: "teacher" },
    publishedAt: new Date().toISOString(),
  };
  NOTICES.push(notice);
  return { ...notice };
}

/** PATCH /notices/{id}/pin — the only edit path besides delete (BR-006). */
export async function toggleNoticePin(noticeId: string): Promise<Notice> {
  await Promise.resolve();
  const notice = NOTICES.find((n) => n.id === noticeId);
  if (!notice) throw new ChatFixtureError("NOT_FOUND");
  notice.pinned = !notice.pinned;
  return { ...notice };
}

/** DELETE /notices/{id} — soft delete (author or School Admin). */
export async function deleteNotice(noticeId: string): Promise<{ id: string; deletedAt: string }> {
  await Promise.resolve();
  const idx = NOTICES.findIndex((n) => n.id === noticeId);
  if (idx === -1) throw new ChatFixtureError("NOT_FOUND");
  NOTICES.splice(idx, 1);
  return { id: noticeId, deletedAt: new Date().toISOString() };
}

/** Clears mutable seam state (tests only). */
export function resetNoticeFixtures(): void {
  seq = 0;
}
