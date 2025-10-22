import { ErrorHandler } from 'hono';

export class CommonError extends Error {
	constructor(
		public status: number,
		public message: string,
	) {
		super(message);
		this.name = 'CommonError';
	}
}

function safeParseJson(object: any) {
	try {
		return JSON.parse(object);
	} catch {
		return null;
	}
}

export const ErrorMiddleware: ErrorHandler = async (err, c) => {
	if (err.name === 'ZodError') {
		return c.json(
			{
				success: false,
				message: 'Validation error',
				status: 400,
				errors: safeParseJson(err.message),
			},
			400,
		);
	}

	if (err instanceof CommonError) {
		return c.json(
			{
				success: false,
				message: err.message,
				status: err.status || 500,
			},
			(err?.status as any) || 500,
		);
	}

	return c.json(
		{
			success: false,
			message: err.message,
			name: err.name,
		},
		500,
	);
};
