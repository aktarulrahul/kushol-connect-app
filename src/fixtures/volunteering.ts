// ─── THE STAGE-2 VOLUNTEERING SEAM (app partner + volunteer) ──────────────────────────────────
// Partner program console (assign/review volunteer tasks, store toggle, order feed), the
// volunteer task loop (claim → start → submit proof → review → XP) and gate express check-in
// (QR pass scan). One-file swap onto the generated client later (same rule as every fixture):
// live swap targets /vendor/campaigns/*, /volunteer/tasks/*, /me/volunteering, /me/xp,
// /vendor/campaigns/{id}/check-in and /commerce/orders — see src/api/schema.gen.ts.
import { createT, DEFAULT_LOCALE } from "@/i18n";

const t = createT(DEFAULT_LOCALE);
const latency = (ms = 180): Promise<void> => new Promise((r) => setTimeout(r, ms));

export type OpsPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type OpsTaskStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "APPROVED"
  | "REVISION_REQUESTED"
  | "CANCELLED";
export type OpsRoleType = "PARTICIPANT" | "VOLUNTEER";
/** The demo volunteer the signed-in fixture user plays (partner approval credits their XP). */
export const ME = "সুমাইয়া জাহান";
const MY_CHECK_IN_CODE = "VOL-7B12DF";
const MY_CERTIFICATE = "KC-CERT-2026-MATH-0481";

export type ProgramRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  volunteers: number;
  participants: number;
};

export type OpsTask = {
  id: string;
  campaignId: string;
  campaignName: string;
  titleBn: string;
  titleEn: string;
  priority: OpsPriority;
  status: OpsTaskStatus;
  xpReward: number;
  isPoolTask: boolean;
  requiresProof: boolean;
  assigneeName?: string;
  claimedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
};

export type OpsVolunteer = {
  userId: string;
  name: string;
  roleTitle: string;
  status: "PENDING" | "APPROVED" | "CHECKED_IN" | "COMPLETED" | "REVOKED";
  checkInCode: string;
};

export type PartnerOrderRow = {
  orderId: string;
  orderCode: string;
  buyer: string;
  totalBdt: number;
  placedAt: string;
  seen: boolean;
};

export type CheckInOutcome = {
  ok: boolean;
  result: "ok" | "duplicate" | "blocked";
  name: string;
  roleType: OpsRoleType;
  campaignName: string;
  at: string;
};

export type MyTasksBundle = {
  assigned: OpsTask[];
  pool: OpsTask[];
  xpBalance: number;
  checkInCode: string;
  certificateSerial: string;
};

type AttendeeRow = {
  code: string;
  name: string;
  roleType: OpsRoleType;
  campaignId: string;
  campaignName: string;
  checkedInAt?: string;
};

const PROGRAM_FAIR: ProgramRow = {
  id: "cmp_demo_1",
  name: "ডেমো বিজ্ঞান মেলা — ক্লাস ১২",
  startsAt: iso(-1),
  endsAt: iso(5),
  volunteers: 2,
  participants: 2,
};
const PROGRAM_FEST: ProgramRow = {
  id: "cmp_demo_2",
  name: "ডেমো বই উৎসব স্বেচ্ছাসেবী দল",
  startsAt: iso(-2),
  endsAt: iso(7),
  volunteers: 2,
  participants: 2,
};
const PROGRAMS: ProgramRow[] = [PROGRAM_FAIR, PROGRAM_FEST];

let tasks: OpsTask[] = [
  {
    id: "ops-101",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
    titleBn: "ক্যাম্পেইন ব্যানার ডিজাইন চূড়ান্ত করুন",
    titleEn: "Finalize campaign banner design",
    priority: "HIGH",
    status: "ASSIGNED",
    xpReward: 80,
    isPoolTask: false,
    requiresProof: true,
    assigneeName: "রাহাত তানভীর",
    createdAt: iso(-4),
  },
  {
    id: "ops-102",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
    titleBn: "স্কুল নোটিশ বোর্ডে পোস্টার স্থাপন",
    titleEn: "Place posters on school notice boards",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    xpReward: 50,
    isPoolTask: false,
    requiresProof: true,
    assigneeName: ME,
    claimedAt: iso(-2),
    createdAt: iso(-4),
  },
  {
    id: "ops-103",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
    titleBn: "স্বাগতম কিট প্রস্তুত করুন",
    titleEn: "Prepare welcome kits",
    priority: "MEDIUM",
    status: "ASSIGNED",
    xpReward: 40,
    isPoolTask: false,
    requiresProof: false,
    assigneeName: ME,
    createdAt: iso(-3),
  },
  {
    id: "ops-104",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
    titleBn: "অংশগ্রহণকারী ফলো-আপ কল",
    titleEn: "Participant follow-up calls",
    priority: "LOW",
    status: "ASSIGNED",
    xpReward: 30,
    isPoolTask: true,
    requiresProof: false,
    createdAt: iso(-3),
  },
  {
    id: "ops-201",
    campaignId: "cmp_demo_2",
    campaignName: PROGRAM_FEST.name,
    titleBn: "স্টেজ ও সাউন্ড চেক",
    titleEn: "Stage and sound check",
    priority: "URGENT",
    status: "SUBMITTED_FOR_REVIEW",
    xpReward: 120,
    isPoolTask: false,
    requiresProof: true,
    assigneeName: "তানজিল হাসান",
    claimedAt: iso(-3),
    submittedAt: iso(-1),
    createdAt: iso(-5),
  },
  {
    id: "ops-202",
    campaignId: "cmp_demo_2",
    campaignName: PROGRAM_FEST.name,
    titleBn: "বইয়ের স্টল সাজানো",
    titleEn: "Set up the book stall",
    priority: "MEDIUM",
    status: "ASSIGNED",
    xpReward: 60,
    isPoolTask: true,
    requiresProof: true,
    createdAt: iso(-4),
  },
];

const volunteers: Record<string, OpsVolunteer[]> = {
  cmp_demo_1: [
    {
      userId: "user_vol_1",
      name: "রাহাত তানভীর",
      roleTitle: "টিম লিডার",
      status: "APPROVED",
      checkInCode: "VOL-E94A1C",
    },
    {
      userId: "user_vol_2",
      name: ME,
      roleTitle: "রেজিস্ট্রেশন ডেস্ক",
      status: "APPROVED",
      checkInCode: MY_CHECK_IN_CODE,
    },
  ],
  cmp_demo_2: [
    {
      userId: "user_vol_3",
      name: "তানজিল হাসান",
      roleTitle: "লজিস্টিকস",
      status: "APPROVED",
      checkInCode: "VOL-55AA10",
    },
    {
      userId: "user_vol_1",
      name: "রাহাত তানভীর",
      roleTitle: "স্টেজ ম্যানেজার",
      status: "CHECKED_IN",
      checkInCode: "VOL-E94A1C",
    },
  ],
};

let attendees: AttendeeRow[] = [
  {
    code: "PRT-3FA12B",
    name: "আরিফ হোসেন",
    roleType: "PARTICIPANT",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
  },
  {
    code: "PRT-9C04DE",
    name: "নুসরাত জাহান",
    roleType: "PARTICIPANT",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
  },
  {
    code: "VOL-E94A1C",
    name: "রাহাত তানভীর",
    roleType: "VOLUNTEER",
    campaignId: "cmp_demo_1",
    campaignName: PROGRAM_FAIR.name,
  },
  {
    code: "PRT-77B2C9",
    name: "সাদিয়া ইসলাম",
    roleType: "PARTICIPANT",
    campaignId: "cmp_demo_2",
    campaignName: PROGRAM_FEST.name,
  },
  {
    code: "PRT-1D44EF",
    name: "তানভীর রহমান",
    roleType: "PARTICIPANT",
    campaignId: "cmp_demo_2",
    campaignName: PROGRAM_FEST.name,
  },
  {
    code: "VOL-55AA10",
    name: "তানজিল হাসান",
    roleType: "VOLUNTEER",
    campaignId: "cmp_demo_2",
    campaignName: PROGRAM_FEST.name,
  },
];

let xpBalance = 250;
let storeEnabled = true;
let orders: PartnerOrderRow[] = [
  {
    orderId: "ord_demo_2",
    orderCode: "KSL-5RC8D",
    buyer: "ডেমো শিক্ষক",
    totalBdt: 640,
    placedAt: iso(-1),
    seen: true,
  },
  {
    orderId: "ord_demo_1",
    orderCode: "KSL-8F3K2",
    buyer: "ডেমো শিক্ষক",
    totalBdt: 320,
    placedAt: iso(-2),
    seen: true,
  },
];

let taskSeq = 0;

function iso(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/* ─── Partner: programs, store, orders ────────────────────────────────────────────────────────── */

/** GET /vendor/campaigns — programs the partner runs (fixture: two demo campaigns). */
export async function listPartnerPrograms(): Promise<ProgramRow[]> {
  await latency();
  return clone(PROGRAMS);
}

/** Whether the partner's campus store is accepting orders (drives order notifications). */
export async function getStoreEnabled(): Promise<boolean> {
  await latency(80);
  return storeEnabled;
}

export async function setStoreEnabled(enabled: boolean): Promise<boolean> {
  await latency(120);
  storeEnabled = enabled;
  return storeEnabled;
}

/** GET /vendor/commerce/orders — the fulfilment feed shown on the program console. */
export async function listPartnerOrders(): Promise<PartnerOrderRow[]> {
  await latency();
  return clone(orders);
}

export async function markPartnerOrdersSeen(): Promise<number> {
  await latency(80);
  orders = orders.map((o) => ({ ...o, seen: true }));
  return orders.length;
}

/**
 * Called by the commerce seam when any order is placed. If the partner's store is enabled the
 * partner console gets an unseen row and the device shows a local notification (deep-links to
 * /marketplace/orders/{id}); with the store disabled placement stays silent.
 */
export async function notifyPartnerOrderPlaced(order: {
  orderId: string;
  orderCode: string;
  buyer: string;
  totalBdt: number;
}): Promise<boolean> {
  if (!storeEnabled) return false;
  orders = [{ ...order, placedAt: new Date().toISOString(), seen: false }, ...orders];
  try {
    const { showLocalNotification } = await import("@/lib/notifications/notifications");
    await showLocalNotification({
      title: t("commerce.order_push_title"),
      body: t("commerce.order_push_body", { code: order.orderCode, total: order.totalBdt }),
      deepLink: `/marketplace/orders/${order.orderId}`,
    });
  } catch {
    // Native notification layer unavailable (tests / bare runs) — the in-app row is enough.
  }
  return true;
}

/* ─── Partner: volunteer task assignment + review ─────────────────────────────────────────────── */

/** GET /vendor/campaigns/{id}/tasks — the partner's task board for one program. */
export async function listPartnerTasks(campaignId: string): Promise<OpsTask[]> {
  await latency();
  return clone(tasks.filter((task) => task.campaignId === campaignId));
}

export type CreateTaskInput = {
  titleBn: string;
  titleEn?: string;
  priority: OpsPriority;
  xpReward: number;
  requiresProof: boolean;
  /** Name of an approved volunteer; omit for an open pool task. */
  assigneeName?: string;
};

/** POST /vendor/campaigns/{id}/tasks — assign to a volunteer or drop it in the open pool. */
export async function createPartnerTask(
  campaignId: string,
  input: CreateTaskInput,
): Promise<OpsTask> {
  await latency();
  const program = PROGRAMS.find((p) => p.id === campaignId);
  if (!program) throw new Error("NOT_FOUND");
  taskSeq += 1;
  const task: OpsTask = {
    id: `ops-new-${String(taskSeq)}`,
    campaignId,
    campaignName: program.name,
    titleBn: input.titleBn,
    titleEn: input.titleEn ?? input.titleBn,
    priority: input.priority,
    status: "ASSIGNED",
    xpReward: input.xpReward,
    isPoolTask: !input.assigneeName,
    requiresProof: input.requiresProof,
    ...(input.assigneeName ? { assigneeName: input.assigneeName } : {}),
    createdAt: new Date().toISOString(),
  };
  tasks = [task, ...tasks];
  return clone(task);
}

/** POST /vendor/campaigns/tasks/{taskId}/review — approve (credits the volunteer's XP) or send back. */
export async function reviewPartnerTask(taskId: string, approve: boolean): Promise<OpsTask> {
  await latency();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("NOT_FOUND");
  if (approve) {
    task.status = "APPROVED";
    task.approvedAt = new Date().toISOString();
    if (task.assigneeName === ME) xpBalance += task.xpReward;
  } else {
    task.status = "REVISION_REQUESTED";
  }
  return clone(task);
}

/** GET /vendor/campaigns/{id}/volunteers — approved volunteers are the assignment targets. */
export async function listCampaignVolunteers(campaignId: string): Promise<OpsVolunteer[]> {
  await latency();
  return clone(volunteers[campaignId] ?? []);
}

/* ─── Volunteer: my tasks, claim/start/submit, XP ─────────────────────────────────────────────── */

/** GET /me/volunteering/tasks + /me/xp — the signed-in volunteer's board. */
export async function listMyTasks(): Promise<MyTasksBundle> {
  await latency();
  const mine = tasks.filter((task) => task.assigneeName === ME && task.status !== "CANCELLED");
  const pool = tasks.filter(
    (task) => task.isPoolTask && task.assigneeName !== ME && task.status !== "CANCELLED",
  );
  return {
    assigned: clone(mine),
    pool: clone(pool),
    xpBalance,
    checkInCode: MY_CHECK_IN_CODE,
    certificateSerial: MY_CERTIFICATE,
  };
}

/** POST /campaigns/tasks/{taskId}/submit — send proof for partner review. */
export async function submitMyTaskProof(taskId: string): Promise<OpsTask> {
  await latency();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.assigneeName !== ME) throw new Error("NOT_FOUND");
  task.status = "SUBMITTED_FOR_REVIEW";
  task.submittedAt = new Date().toISOString();
  return clone(task);
}

/** PATCH /me/volunteering/tasks/{taskId} — start an assigned task. */
export async function startMyTask(taskId: string): Promise<OpsTask> {
  await latency(120);
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.assigneeName !== ME) throw new Error("NOT_FOUND");
  task.status = "IN_PROGRESS";
  task.claimedAt = task.claimedAt ?? new Date().toISOString();
  return clone(task);
}

/** POST /campaigns/tasks/{taskId}/claim — pull an open pool task onto my board. */
export async function claimPoolTask(taskId: string): Promise<OpsTask> {
  await latency();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.isPoolTask) throw new Error("NOT_FOUND");
  task.isPoolTask = false;
  task.assigneeName = ME;
  task.status = "IN_PROGRESS";
  task.claimedAt = new Date().toISOString();
  return clone(task);
}

/* ─── Gate: express check-in (QR pass scan) ───────────────────────────────────────────────────── */

/** POST /vendor/campaigns/{id}/check-in — validate a scanned pass code at the gate. */
export async function expressCheckIn(rawCode: string): Promise<CheckInOutcome> {
  await latency(140);
  const code = rawCode.trim().toUpperCase();
  const attendee = attendees.find((a) => a.code === code);
  const at = new Date().toISOString();
  if (!attendee) {
    return {
      ok: false,
      result: "blocked",
      name: "",
      roleType: "PARTICIPANT",
      campaignName: "",
      at,
    };
  }
  if (attendee.checkedInAt) {
    return {
      ok: false,
      result: "duplicate",
      name: attendee.name,
      roleType: attendee.roleType,
      campaignName: attendee.campaignName,
      at: attendee.checkedInAt,
    };
  }
  attendee.checkedInAt = at;
  return {
    ok: true,
    result: "ok",
    name: attendee.name,
    roleType: attendee.roleType,
    campaignName: attendee.campaignName,
    at,
  };
}

/** Recent gate activity for the scan screen (newest first). */
export async function listRecentCheckIns(): Promise<
  { code: string; name: string; result: CheckInOutcome["result"]; at: string }[]
> {
  await latency(80);
  return attendees
    .filter((a) => a.checkedInAt)
    .sort((a, b) => +new Date(b.checkedInAt ?? 0) - +new Date(a.checkedInAt ?? 0))
    .map((a) => ({
      code: a.code,
      name: a.name,
      result: "ok" as const,
      at: a.checkedInAt as string,
    }));
}

export function resetVolunteeringFixtures(): void {
  taskSeq = 0;
  xpBalance = 250;
  storeEnabled = true;
  orders = orders
    .filter((o) => o.orderId.startsWith("ord_demo_"))
    .map((o) => ({ ...o, seen: true }));
  tasks = tasks.filter((task) => !task.id.startsWith("ops-new-"));
  tasks = tasks.map((task) => {
    if (task.id === "ops-201")
      return { ...task, status: "SUBMITTED_FOR_REVIEW", approvedAt: undefined };
    if (task.id === "ops-102") return { ...task, status: "IN_PROGRESS" };
    if (task.id === "ops-103") return { ...task, status: "ASSIGNED" };
    return task;
  });
  attendees = attendees.map((a) => ({ ...a, checkedInAt: undefined }));
}
