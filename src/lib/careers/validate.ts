import { z } from "zod";

const https = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That link is too long.")
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" && !!u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "Use a full link that starts with https://");

const optional = <T extends z.ZodType>(s: T) => z.union([z.literal(""), s]).optional();

/** What the apply form may send. Trimmed and length-checked here before anything goes to WonderJobs. */
export const applicationSchema = z.object({
  jobId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, "Unknown position."),
  name: z.string().trim().min(2, "Please enter your full name.").max(120, "That name is too long."),
  email: z.string().trim().max(200, "That email is too long.").pipe(z.email("Please use a valid email address.")),
  phone: optional(z.string().trim().max(40, "That phone number is too long.").regex(/^[+()\d\s.-]{5,40}$/, "Please check the phone number.")),
  location: optional(z.string().trim().max(120, "That location is too long.")),
  linkedinUrl: optional(https(500)),
  resumeUrl: https(500),
  coverNote: optional(z.string().trim().max(4000, "The cover note can be up to 4000 characters.")),
  consent: z.literal(true, "Please tick the box to agree, so we can consider your application."),
  /** Honeypot: people never see it. */
  website: z.string().optional(),
});

export type ApplicationForm = z.infer<typeof applicationSchema>;

export const statusSchema = z.object({
  token: z.string().trim().min(10).max(500).regex(/^[A-Za-z0-9._~-]+$/),
  action: z.enum(["view", "withdraw"]).default("view"),
});
