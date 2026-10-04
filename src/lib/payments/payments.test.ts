import { deepLinkFor } from "@/lib/notifications/notifications";
import {
  getInvoiceStatus,
  initiatePayment,
  listMyInvoices,
  paymentsFixtureFlags,
  resetPaymentsFixtures,
} from "@/fixtures/payments";
import { PAYMENTS_FIXTURE_MODES } from "@/fixtures/payments";

afterEach(() => {
  resetPaymentsFixtures();
});

describe("payments payer seam (Stage 2 fixtures)", () => {
  it("lists due + paid invoices (demo data, fictional)", async () => {
    const rows = await listMyInvoices();
    expect(rows.length).toBe(3);
    expect(rows.find((i) => i.status === "paid")).toBeTruthy();
  });

  it("conflicts on a paid invoice; refuses gateway-down with PAYMENT_FAILED semantics", async () => {
    await expect(initiatePayment("inv_demo_3", "bkash")).rejects.toMatchObject({ code: "CONFLICT" });
    paymentsFixtureFlags.mode = "gateway_down";
    await expect(initiatePayment("inv_demo_1", "bkash")).rejects.toMatchObject({
      detail: "PAYMENT_FAILED:bkash",
    });
  });

  it("settles the sandbox payment on the status poll; offline blocks reads", async () => {
    const before = await getInvoiceStatus("inv_demo_1");
    expect(before.status).toBe("paid"); // sandbox settles after the gateway session
    expect(before.paidTxnId).toBeTruthy();
    paymentsFixtureFlags.mode = "offline";
    await expect(listMyInvoices()).rejects.toMatchObject({ code: "OFFLINE" });
  });

  it("maps the deep links (additive 06 §7): fee_due → pay screen, result → receipt", () => {
    expect(deepLinkFor({ deepLink: "/payments/inv_9" })).toEqual({
      pathname: "/payments/[invoiceId]",
      params: { invoiceId: "inv_9" },
    });
    expect(deepLinkFor({ deepLink: "/receipts/txn_5" })).toEqual({
      pathname: "/receipts/[txnId]",
      params: { txnId: "txn_5" },
    });
  });
});

describe("money is never queued offline (§8)", () => {
  it("exposes the fixture modes without an offline queue mode", () => {
    // Commerce queues placements offline; payments deliberately has no queue mode at all —
    // the flag switcher has no "queued" state and Pay is refused up front (§2.1 offline row).
    expect(PAYMENTS_FIXTURE_MODES).not.toContain("queued");
  });
});
