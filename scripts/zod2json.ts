import { z } from 'zod';

export const skip = z.coerce.number().min(0).default(0);
export const limit = z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(10);

export const paginateSchema = z.object({
	skip: skip,
	limit: limit,
});

// Convert the Zod schema to JSON Schema
const jsonSchema = z.toJSONSchema(paginateSchema);

console.log(jsonSchema);
