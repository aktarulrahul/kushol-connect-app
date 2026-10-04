import type { RequirementInput } from "@/fixtures/tuition";
import {
  queueRequirementPost,
  removeQueuedPost,
  replayPendingPosts,
} from "./use-tuition";

function input(over: Partial<RequirementInput> = {}): RequirementInput {
  return {
    subjects: ["math"],
    classLevel: "class_9",
    budgetMin: 2000,
    budgetMax: 4000,
    genderPref: "any",
    locationArea: "মিরপুর, ঢাকা",
    lat: 23.8,
    lng: 90.4,
    ...over,
  };
}

afterEach(() => {
  // drain whatever a test queued
  for (let i = 0; i < 20; i += 1) removeQueuedPost(`q_${String(i)}`);
});

describe("offline wizard queue (TUT-AP-014)", () => {
  it("queues a post and removes it after a successful replay", async () => {
    const queued = queueRequirementPost(input());
    expect(queued.id).toBeTruthy();
    const remaining = await replayPendingPosts(true, (i) => Promise.resolve(i));
    expect(remaining.find((row) => row.id === queued.id)).toBeUndefined();
  });

  it("replays once when online and keeps the post queued on failure", async () => {
    queueRequirementPost(input());
    let attempts = 0;
    let fail = true;
    const replay = () => {
      attempts += 1;
      return fail ? Promise.reject(new Error("offline")) : Promise.resolve();
    };

    let remaining = await replayPendingPosts(true, replay);
    expect(attempts).toBe(1);
    expect(remaining).toHaveLength(1); // failure keeps it queued with the banner visible

    fail = false;
    remaining = await replayPendingPosts(true, replay);
    expect(attempts).toBe(2);
    expect(remaining).toHaveLength(0);
  });

  it("never replays offline", async () => {
    queueRequirementPost(input());
    let attempts = 0;
    const remaining = await replayPendingPosts(false, () => {
      attempts += 1;
      return Promise.resolve();
    });
    expect(attempts).toBe(0);
    expect(remaining).toHaveLength(1);
  });
});
