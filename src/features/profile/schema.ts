import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  // add password update logic if needed
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
