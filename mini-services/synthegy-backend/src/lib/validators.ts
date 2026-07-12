// Zod schemas — single source of truth for request validation across routes.

import { z } from "zod";

export const EvaluateRequest = z.object({
  target: z.string().max(200).optional().default(""),
  smiles: z.string().max(2000).optional().default(""),
  instruction: z.string().min(1, "instruction is required").max(2000),
  workflowId: z
    .enum(["retrosynthesis", "mechanism", "alignment"])
    .optional()
    .default("retrosynthesis"),
  sessionId: z.string().max(100).optional(),
});
export type EvaluateRequest = z.infer<typeof EvaluateRequest>;

export const CreateSessionRequest = z.object({
  label: z.string().min(1).max(120),
  chemistId: z.string().max(100).optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequest>;

export const UpdateSessionRequest = z.object({
  label: z.string().min(1).max(120).optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequest>;
