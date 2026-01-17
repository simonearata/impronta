import { z } from "zod";

export const ContactLeadInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(5).optional(),
  subject: z.string().trim().min(3),
  message: z.string().trim().min(10),
});

export type ContactLeadInput = z.infer<typeof ContactLeadInputSchema>;
