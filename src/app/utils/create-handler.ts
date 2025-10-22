import { MethodSchemas, ParamDefinition } from '../types';
import { parseBody } from './common-utils';

export function createRouteHandler(
	instance: any,
	route: { propertyKey: string | symbol },
	paramDefs: ParamDefinition[],
	schemas?: MethodSchemas,
	statusCode?: number | undefined,
) {
	return async (c: any) => {
		try {
			// Prepare data containers
			let bodyData: any;
			let queryAll: Record<string, string | string[] | undefined> | undefined;
			let paramsAll: Record<string, string> | undefined;
			let headersAll: Record<string, string> | undefined;

			// Load raw aggregates if method-level schemas exist
			if (schemas?.body) bodyData = await parseBody(c);
			if (schemas?.query) queryAll = c.req.queries();
			if (schemas?.params) paramsAll = c.req.param();
			if (schemas?.headers) {
				headersAll = {};
				// Normalize: Hono's c.req.raw.headers is Headers
				for (const [k, v] of c.req.raw.headers) {
					headersAll[k.toLowerCase()] = v;
				}
			}

			// Validate full objects first if provided
			if (schemas?.body) {
				bodyData = schemas.body.parse(bodyData);
			}
			if (schemas?.query) {
				queryAll = schemas.query.parse(queryAll ?? c.req.queries()) as Record<string, string | string[] | undefined>;
			}
			if (schemas?.params) {
				const parsed = schemas.params.parse(paramsAll ?? c.req.param());

				paramsAll = parsed as Record<string, string>;
			}
			if (schemas?.headers) {
				headersAll = schemas.headers.parse(headersAll) as Record<string, string>;
			}

			// Build arguments based on param decorators
			const maxIndex = paramDefs.reduce((m, p) => Math.max(m, p.index), -1);
			const args = new Array(maxIndex + 1).fill(undefined);

			for (const p of paramDefs) {
				switch (p.type) {
					case 'ctx': {
						args[p.index] = c;
						break;
					}
					case 'req': {
						args[p.index] = c.req;
						break;
					}
					case 'body': {
						const raw = bodyData ?? (bodyData = await parseBody(c));
						if (p.schema) {
							args[p.index] = p.schema.parse(raw);
						} else {
							args[p.index] = raw;
						}
						break;
					}
					case 'query': {
						if (p.name) {
							const raw = c.req.query(p.name);
							if (p.schema) {
								args[p.index] = p.schema.parse(raw);
							} else {
								args[p.index] = raw;
							}
						} else {
							const all = queryAll ?? c.req.queries();
							if (p.schema) {
								args[p.index] = p.schema.parse(all);
							} else {
								args[p.index] = all;
							}
						}
						break;
					}
					case 'param': {
						const val = p.name ? c.req.param(p.name) : c.req.param();
						if (p.schema) {
							args[p.index] = p.schema.parse(val);
						} else {
							args[p.index] = val;
						}
						break;
					}
					case 'header': {
						if (p.name) {
							const raw = c.req.header(p.name);
							if (p.schema) {
								args[p.index] = p.schema.parse(raw);
							} else {
								args[p.index] = raw;
							}
						} else {
							const all: Record<string, string> = {};
							for (const [k, v] of c.req.raw.headers) {
								all[k.toLowerCase()] = v;
							}
							if (p.schema) {
								args[p.index] = p.schema.parse(all);
							} else {
								args[p.index] = all;
							}
						}
						break;
					}
				}
			}

			// Call the actual method
			const result = await instance[route.propertyKey as keyof typeof instance](...args);

			if (result instanceof Response) {
				return result;
			}

			if (result === undefined) {
				return c.body(null, 204);
			}

			if (typeof statusCode === 'number') {
				return c.json(result, statusCode);
			}

			return c.json(result);
		} catch (err: any) {
			// error will be handled by app-level error handler
			throw err;
		}
	};
}
