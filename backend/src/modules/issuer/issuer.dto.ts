import { z } from 'zod';

export const SaveIssuerDto = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(160),
  email: z.email().max(254),
  phone: z.string().trim().min(1).max(40),
  razonSocial: z.string().trim().min(1).max(200),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC no válido.'),
  location: z.string().trim().min(1).max(200),
  /** Entered in the admin. https only: the client page and the PDF load it. */
  logoUrl: z.url({ protocol: /^https$/ }).max(500).nullish(),
});
export type SaveIssuerDto = z.infer<typeof SaveIssuerDto>;
