import { toJSONSchema, ZodError, ZodType } from 'zod';

export function cleanSchemaForIntrospection(schema: ZodType, name?: string): any {
	const JSONSchema = toJSONSchema(schema);
	const { $schema, ...cleanedSchema } = JSONSchema;
	return {
		name,
		...cleanedSchema,
	};
}

export function unwrapSingleItemArray<T>(array: T[]): T | T[] {
	return array.length === 1 ? array[0] : array;
}

export function formatZodError(err: ZodError, rootPath?: string) {
	return {
		message: 'Validation failed',
		issues: err.issues.map((i) => ({
			path: `${rootPath || ''}${i.path.join('.')}`,
			message: i.message,
			code: i.code,
		})),
	};
}

export async function parseBody(c: any) {
	const ct = c.req.header('content-type') || '';
	try {
		if (ct.includes('application/json')) {
			return await c.req.json();
		}
	} catch {
		// Fall through to other body types
	}
	if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
		// Hono parses both via parseBody
		const body = await c.req.parseBody();
		return body;
	}
	// For raw or text
	try {
		const t = await c.req.text();
		return t;
	} catch {
		return undefined;
	}
}
