import z from 'zod';

export const createTodoSchema = z.object({
	title: z.string().min(1),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const skipSchema = z.coerce.number().min(0).default(0);
export const limitSchema = z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(10);

export const updateTodoSchema = createTodoSchema.extend({
	completed: z.boolean().optional().default(false),
});

export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
