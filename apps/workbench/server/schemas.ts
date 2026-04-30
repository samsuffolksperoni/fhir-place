import { z } from "zod";

/**
 * Phase A allow-lists. Both are enforced at the validation boundary so any
 * unknown value (e.g. `kind: "omop"` or `authType: "smart"`) is rejected
 * before it can touch the DB.
 */
export const ConnectionKind = z.enum(["fhir_clinical"]);
export type ConnectionKind = z.infer<typeof ConnectionKind>;

export const AuthType = z.enum(["none", "bearer"]);
export type AuthType = z.infer<typeof AuthType>;

export const CreateConnectionInput = z
  .object({
    name: z.string().min(1).max(120),
    kind: ConnectionKind,
    baseUrl: z.string().url().min(1),
    authType: AuthType,
    authToken: z.string().min(1).max(4096).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.authType === "bearer" && !value.authToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authToken"],
        message: "authToken is required when authType is 'bearer'",
      });
    }
    if (value.authType === "none" && value.authToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authToken"],
        message: "authToken must be omitted when authType is 'none'",
      });
    }
  });

export type CreateConnectionInput = z.infer<typeof CreateConnectionInput>;

export const ConnectionId = z.string().min(1).max(64);
