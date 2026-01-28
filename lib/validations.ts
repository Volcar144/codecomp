/**
 * Zod Validation Schemas
 * Centralized validation for all API inputs
 */

import { z } from "zod";

// Supported programming languages
export const SUPPORTED_LANGUAGES = [
  "python",
  "javascript",
  "java",
  "cpp",
  "csharp",
  "go",
  "rust",
  "typescript",
] as const;

// =============================================
// Common Schemas
// =============================================

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const languageSchema = z.enum(SUPPORTED_LANGUAGES).refine(
  (val) => SUPPORTED_LANGUAGES.includes(val),
  { message: "Unsupported programming language" }
);

// =============================================
// Competition Schemas
// =============================================

export const createCompetitionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  description: z.string().max(5000, "Description too long").optional(),
  rules: z.string().max(10000, "Rules too long").optional(),
  start_date: z
    .string()
    .datetime("Invalid start date format")
    .refine((date) => new Date(date) > new Date(), {
      message: "Start date cannot be in the past",
    }),
  end_date: z.string().datetime("Invalid end date format"),
  allowed_languages: z
    .array(languageSchema)
    .min(1, "At least one programming language must be selected")
    .max(10, "Too many languages selected"),
  is_public: z.boolean().default(true),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const updateCompetitionSchema = createCompetitionSchema.partial().extend({
  status: z.enum(["draft", "active", "ended", "cancelled"]).optional(),
});

// =============================================
// Test Case Schemas
// =============================================

export const createTestCaseSchema = z.object({
  competition_id: uuidSchema,
  input: z.string().max(50000, "Input too large"),
  expected_output: z.string().max(50000, "Expected output too large"),
  points: z.number().int().min(0).max(1000).default(10),
  is_hidden: z.boolean().default(false),
});

export const updateTestCaseSchema = createTestCaseSchema.partial().omit({
  competition_id: true,
});

// =============================================
// Submission Schemas
// =============================================

export const createSubmissionSchema = z.object({
  competition_id: uuidSchema,
  code: z
    .string()
    .min(1, "Code is required")
    .max(100000, "Code exceeds maximum length"),
  language: languageSchema,
});

// =============================================
// Code Execution Schemas
// =============================================

export const executeCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(100000, "Code exceeds maximum length"),
  language: languageSchema,
  competition_id: uuidSchema.optional(),
  test_only: z.boolean().default(false),
  stdin: z.string().max(10000, "Standard input too large").optional(),
});

// =============================================
// Arena Schemas
// =============================================

export const createArenaSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  description: z.string().max(5000, "Description too long").optional(),
  github_repo: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, "Invalid GitHub repo format (use owner/repo)"),
  start_date: z.string().datetime("Invalid start date format").optional(),
  end_date: z.string().datetime("Invalid end date format").optional(),
  is_public: z.boolean().default(false),
  max_participants: z.number().int().min(1).max(1000).optional(),
  judging_criteria: z.string().max(10000, "Judging criteria too long").optional(),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) > new Date(data.start_date);
    }
    return true;
  },
  { message: "End date must be after start date", path: ["end_date"] }
);

export const joinArenaSchema = z.object({
  arena_id: uuidSchema,
  directory_path: z
    .string()
    .min(1, "Directory path is required")
    .max(500, "Directory path too long")
    .regex(/^[a-zA-Z0-9_\-\/]+$/, "Invalid directory path characters"),
  github_username: z.string().max(100).optional(),
});

export const scoreParticipantSchema = z.object({
  participant_id: uuidSchema,
  score: z.number().int().min(0).max(100),
  feedback: z.string().max(5000, "Feedback too long").optional(),
});

// =============================================
// Auth Schemas
// =============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .trim(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const newPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// =============================================
// Template Schemas
// =============================================

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name too long")
    .trim(),
  description: z.string().max(1000, "Description too long").optional(),
  competition_data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    rules: z.string().optional(),
    allowed_languages: z.array(languageSchema).optional(),
    is_public: z.boolean().optional(),
  }),
  test_cases: z.array(z.object({
    input: z.string(),
    expected_output: z.string(),
    points: z.number().int().min(0).max(1000).optional(),
    is_hidden: z.boolean().optional(),
  })).optional(),
  is_public: z.boolean().default(false),
});

// =============================================
// Terminal Schemas
// =============================================

export const createTerminalSessionSchema = z.object({
  language: languageSchema,
  arena_id: uuidSchema.optional(),
});

export const executeTerminalCommandSchema = z.object({
  session_id: z.string().min(1, "Session ID is required"),
  code: z.string().max(50000, "Code too large"),
});

// =============================================
// Utility Functions
// =============================================

/**
 * Parse and validate input with a Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string; details?: z.ZodIssue[] } {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const firstError = result.error.issues[0];
  return {
    success: false,
    error: firstError?.message || "Validation failed",
    details: result.error.issues,
  };
}

/**
 * Create a validation error response
 */
export function validationError(error: string, details?: z.ZodIssue[]) {
  return {
    error,
    ...(details && { details: details.map(d => ({ path: d.path.join("."), message: d.message })) }),
  };
}

// Type exports
export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
export type CreateArenaInput = z.infer<typeof createArenaSchema>;
export type JoinArenaInput = z.infer<typeof joinArenaSchema>;
export type ScoreParticipantInput = z.infer<typeof scoreParticipantSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
