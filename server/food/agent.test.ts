import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), env: { forgeApiUrl: "", forgeApiKey: "" } }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invoke }));
vi.mock("../_core/env", () => ({ ENV: mocks.env }));

import { extractWithAI, generateGroundedReply } from "./agent";

const sample = { id: "safe-id", name: "Sambar Rice", cuisine: "South Indian", description: "Lentil rice", diet: "vegan", priceINR: 120, prepMinutes: 25, spice: 2, matchReason: "fits your stated vegetarian choice" };

describe("CRAVE IT structured AI adapter", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.env.forgeApiUrl = "";
    mocks.env.forgeApiKey = "";
  });
  it("falls back without a provider call when server credentials are absent", async () => {
    expect(await extractWithAI("vegetarian dinner")).toBeNull();
    expect(await generateGroundedReply({ query: "vegetarian dinner", appliedConstraints: [], limitation: null, recommendations: [sample] })).toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("ignores malformed model JSON so deterministic intent parsing can continue", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: "not JSON" } }] });
    expect(await extractWithAI("vegetarian dinner")).toBeNull();
  });
  it("rejects a schema-empty object instead of marking the fallback as live AI", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: "{}" } }] });
    expect(await extractWithAI("vegetarian dinner")).toBeNull();
  });
  it("handles provider errors without claiming that model data is available", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockRejectedValue(new Error("provider offline"));
    expect(await extractWithAI("vegetarian dinner")).toBeNull();
    expect(await generateGroundedReply({ query: "vegetarian dinner", appliedConstraints: [], limitation: null, recommendations: [sample] })).toBeNull();
  });
  it("bounds model-provided budget/time and accepts only known preference values", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ intent: "easy dinner", diet: "vegetarian", difficulty: "easy", cookingMinutes: 500, mode: "takeaway", budget: 99999, spiceLevel: 9, mealType: "not-a-meal", allergies: ["peanuts"], seasonalIntent: "winter greens", followUpQuestion: null }) } }] });
    const result = await extractWithAI("easy vegetarian dinner");
    expect(result).toMatchObject({ diet: "vegetarian", difficulty: "easy", cookingMinutes: 240, mode: "takeaway", budget: 10000, spiceLevel: 3, allergies: ["peanuts"], seasonalIntent: "winter greens" });
    expect(result?.mealType).toBeUndefined();
  });
  it("keeps model-selected IDs inside the server-filtered catalog and rejects invented IDs", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ acknowledgment: "That sounds like a lovely savoury craving.", selectedIds: ["safe-id", "invented-id"], followUpQuestion: null }) } }] });
    const result = await generateGroundedReply({ query: "savoury dinner", appliedConstraints: ["Diet: vegan"], limitation: null, recommendations: [sample] });
    expect(result).toEqual({ acknowledgment: "That sounds like a lovely savoury craving.", selectedIds: ["safe-id"], followUpQuestion: null });
  });
  it("rejects unsupported price or nutrition claims in chat acknowledgments", async () => {
    mocks.env.forgeApiUrl = "configured"; mocks.env.forgeApiKey = "configured";
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ acknowledgment: "It costs ₹50 and has 300 calories.", selectedIds: ["safe-id"], followUpQuestion: null }) } }] });
    expect(await generateGroundedReply({ query: "dinner", appliedConstraints: [], limitation: null, recommendations: [sample] })).toBeNull();
  });
});
