/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AlertChannel } from "@shared/schema";
import { AlertDeliveryService } from "./delivery";
import type { RuleEvaluationResult } from "./rules-engine";

const channel = {
  name: "Email",
  type: "email",
  config: { recipients: ["ops@example.com"], subject: "Alert subject" },
} as unknown as AlertChannel;

const result = {
  ruleId: 1,
  ruleName: "Visibility drop",
  ruleType: "visibility_drop",
  triggered: true,
  currentValue: 40,
  previousValue: 60,
  threshold: 10,
  change: -20,
  changePercent: -33,
  message: "Visibility dropped",
  data: {},
} as unknown as RuleEvaluationResult;

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.ALERT_EMAIL_FROM;

function send(service: AlertDeliveryService): Promise<void> {
  return (service as unknown as {
    sendEmail(channel: AlertChannel, result: RuleEvaluationResult): Promise<void>;
  }).sendEmail.call(service, channel, result);
}

describe("email alert delivery", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.ALERT_EMAIL_FROM = "OpenAEO <alerts@example.com>";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.ALERT_EMAIL_FROM;
    else process.env.ALERT_EMAIL_FROM = originalFrom;
  });

  it("names the missing variable when Resend is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(send(AlertDeliveryService.getInstance())).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("names the missing variable when the sender is unset", async () => {
    delete process.env.ALERT_EMAIL_FROM;
    await expect(send(AlertDeliveryService.getInstance())).rejects.toThrow(/ALERT_EMAIL_FROM/);
  });

  it("posts the alert through Resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    vi.stubGlobal("fetch", fetchMock);

    await send(AlertDeliveryService.getInstance());

    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer re_test" }),
    }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ from: "OpenAEO <alerts@example.com>", to: ["ops@example.com"], subject: "Alert subject" });
    expect(body.text).toContain("Visibility dropped");
  });

  it("surfaces the provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid API key" }),
    }));

    await expect(send(AlertDeliveryService.getInstance())).rejects.toThrow("Invalid API key");
  });
});
