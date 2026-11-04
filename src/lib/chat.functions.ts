import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  pageContext: z.string().max(12000),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(40),
});

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const instructions = `You are the HOTSPOT SYNC assistant inside a NASA Space Apps fire-intelligence app.
Answer questions about the page the user is viewing, using ONLY the page guide and data below. Be concise (under 150 words unless asked), use markdown lists/tables when helpful.
All numbers are demonstration (sample) data — say so when quoting numbers. Anomalies are deviations from a historical monthly median, never predictions.
If something isn't in the context, say you don't have it and suggest where in the app to look.

${data.pageContext}`;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const text = (res.output ?? [])
        .flatMap((o: any) => (o.type === "message" ? o.content ?? [] : []))
        .filter((c: any) => c.type === "output_text")
        .map((c: any) => c.text)
        .join("");
      return { ok: true as const, text: text || "I couldn't come up with an answer. Try rephrasing." };
    } catch (e) {
      if (e instanceof GatewayError) {
        const msg = e.httpStatus === 429 ? "Too many questions right now — wait a moment and try again."
          : e.httpStatus === 402 ? "The assistant is out of AI credits for this workspace."
          : "The assistant couldn't answer right now. Please try again.";
        return { ok: false as const, text: msg };
      }
      throw e;
    }
  });
