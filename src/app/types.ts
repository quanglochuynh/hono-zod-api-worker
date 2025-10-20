import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

export type Constructor<T = any> = new (...args: any[]) => T;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'all';

export type ParamType = 'body' | 'query' | 'param' | 'header' | 'ctx' | 'req';

export type ParamDefinition = {
	index: number;
	type: ParamType;
	name?: string;
	schema?: ZodTypeAny;
};

export type MethodSchemas = Partial<{
	body: ZodTypeAny;
	query: ZodTypeAny;
	params: ZodTypeAny;
	headers: ZodTypeAny;
}>;

export type RouteDefinition = {
	method: HttpMethod;
	path: string;
	propertyKey: string | symbol;
	middlewares?: MiddlewareHandler[];
	statusCode?: number;
	schemas?: MethodSchemas;
};

export type BuildOptions = {
	base?: string;
	topMiddlewares?: { path: string; middlewares: MiddlewareHandler[] }[];
	onError?: ErrorHandler;
	notFoundHandler?: MiddlewareHandler;
};

export type AnyZodObject = ZodObject<ZodRawShape>;
