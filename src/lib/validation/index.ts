import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");
// Egyptian mobile numbers (01x xxxx xxxx), optionally with +20 prefix. Adjust per market.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+20|0020|0)?1[0125]\d{8}$/.test(v), "Enter a valid mobile number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2, "Enter the recipient name").max(100),
  phone: phoneSchema,
  governorate: z.string().trim().min(2, "Select a governorate").max(60),
  city: z.string().trim().min(2, "Enter a city").max(80),
  street: z.string().trim().min(3, "Enter the street address").max(200),
  building: z.string().trim().max(60).optional().or(z.literal("")),
  apartment: z.string().trim().max(60).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  shippingZoneId: z.string().uuid("Select a shipping option"),
  paymentMethod: z.enum(["COD", "CARD"]),
  discountCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
  saveAddress: z.boolean().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm you'd like to receive emails" }) }),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
