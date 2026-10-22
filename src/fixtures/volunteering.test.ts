import {
  claimPoolTask,
  createPartnerTask,
  expressCheckIn,
  getStoreEnabled,
  listMyTasks,
  listPartnerOrders,
  listPartnerTasks,
  notifyPartnerOrderPlaced,
  resetVolunteeringFixtures,
  reviewPartnerTask,
  setStoreEnabled,
  startMyTask,
  submitMyTaskProof,
} from "./volunteering";

describe("volunteering fixture", () => {
  beforeEach(() => {
    resetVolunteeringFixtures();
  });

  it("assigns a task to a named volunteer and to the pool", async () => {
    const assigned = await createPartnerTask("cmp_demo_1", {
      titleBn: "গেটে স্বাগতম",
      priority: "HIGH",
      xpReward: 45,
      requiresProof: true,
      assigneeName: "রাহাত তানভীর",
    });
    expect(assigned.status).toBe("ASSIGNED");
    expect(assigned.assigneeName).toBe("রাহাত তানভীর");
    expect(assigned.isPoolTask).toBe(false);

    const pooled = await createPartnerTask("cmp_demo_1", {
      titleBn: "জল বিতরণ",
      priority: "LOW",
      xpReward: 20,
      requiresProof: false,
    });
    expect(pooled.isPoolTask).toBe(true);

    const board = await listPartnerTasks("cmp_demo_1");
    expect(board.map((t) => t.id)).toContain(assigned.id);
    expect(board.map((t) => t.id)).toContain(pooled.id);
  });

  it("runs the volunteer loop: start → submit → partner approval credits my XP", async () => {
    const before = await listMyTasks();
    const mine = before.assigned.find((task) => task.id === "ops-102");
    expect(mine?.status).toBe("IN_PROGRESS");

    await submitMyTaskProof("ops-102");
    const afterSubmit = await listMyTasks();
    expect(afterSubmit.assigned.find((task) => task.id === "ops-102")?.status).toBe(
      "SUBMITTED_FOR_REVIEW",
    );

    const xpBefore = afterSubmit.xpBalance;
    const approved = await reviewPartnerTask("ops-102", true);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeTruthy();

    // Approval credits the assignee — ops-102 belongs to the signed-in demo volunteer.
    const after = await listMyTasks();
    expect(after.xpBalance).toBe(xpBefore + (mine?.xpReward ?? 0));

    // Revision path: partner sends তানজিল's task back — no XP change for me.
    await reviewPartnerTask("ops-201", false);
    const board = await listPartnerTasks("cmp_demo_2");
    expect(board.find((task) => task.id === "ops-201")?.status).toBe("REVISION_REQUESTED");
  });

  it("claims a pool task onto my board and starts assigned work", async () => {
    const claimed = await claimPoolTask("ops-104");
    expect(claimed.assigneeName).toBe("সুমাইয়া জাহান");
    expect(claimed.status).toBe("IN_PROGRESS");

    const started = await startMyTask("ops-103");
    expect(started.status).toBe("IN_PROGRESS");

    const bundle = await listMyTasks();
    expect(bundle.assigned.map((t) => t.id)).toContain("ops-104");
    expect(bundle.pool.map((t) => t.id)).not.toContain("ops-104");
  });

  it("express check-in: ok once, duplicate after, unknown blocked", async () => {
    const first = await expressCheckIn("prt-3fa12b"); // case/space tolerant
    expect(first.ok).toBe(true);
    expect(first.result).toBe("ok");
    expect(first.name).toBe("আরিফ হোসেন");

    const duplicate = await expressCheckIn("PRT-3FA12B");
    expect(duplicate.ok).toBe(false);
    expect(duplicate.result).toBe("duplicate");

    const blocked = await expressCheckIn("PRT-NOPE99");
    expect(blocked.ok).toBe(false);
    expect(blocked.result).toBe("blocked");
  });

  it("notifies the partner on placed orders only while the store is enabled", async () => {
    expect(await getStoreEnabled()).toBe(true);
    const placed = await notifyPartnerOrderPlaced({
      orderId: "ord_new_1",
      orderCode: "KSL-TEST1",
      buyer: "ডেমো শিক্ষক",
      totalBdt: 250,
    });
    expect(placed).toBe(true);
    const orders = await listPartnerOrders();
    expect(orders[0]?.orderCode).toBe("KSL-TEST1");
    expect(orders[0]?.seen).toBe(false);

    await setStoreEnabled(false);
    const silenced = await notifyPartnerOrderPlaced({
      orderId: "ord_new_2",
      orderCode: "KSL-TEST2",
      buyer: "ডেমো শিক্ষক",
      totalBdt: 90,
    });
    expect(silenced).toBe(false);
    const after = await listPartnerOrders();
    expect(after.map((o) => o.orderCode)).not.toContain("KSL-TEST2");
  });
});
