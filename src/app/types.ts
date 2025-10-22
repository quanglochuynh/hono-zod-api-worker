import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { ZodObject, ZodRawShape, ZodType } from 'zod';

export type Constructor<T = any> = new (...args: any[]) => T;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'all';

export type ParamType = 'body' | 'query' | 'param' | 'header' | 'ctx' | 'req';

export type ParamDefinition = {
	index: number;
	type: ParamType;
	name?: string | undefined;
	schema?: ZodType | undefined;
};

export type MethodSchemas = Partial<{
	body: ZodType;
	query: ZodType;
	params: ZodType;
	headers: ZodType;
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
	enableIntrospection?: boolean;
	introspectionPath?: string;
};

export type IntrospectionObject = {
	method: HttpMethod;
	path: string;
	schema?: {
		body?: any;
		query?: any;
		params?: any;
		headers?: any;
	};
};

type DecoratorOptionsWithSchema = {
	// withSchema: true;
	schema: ZodType;
};

type DecoratorOptionsWithoutSchema = {
	// withSchema?: false;
	name: string;
	schema?: ZodType;
};

export type DecoratorOptions = DecoratorOptionsWithSchema | DecoratorOptionsWithoutSchema;

export type AnyZodObject = ZodObject<ZodRawShape>;
