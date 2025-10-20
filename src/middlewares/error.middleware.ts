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

interface ErrorResponse {
	success: boolean;
	message: string;
	status?: number;
	name?: string;
}

interface Context {
	json: (body: ErrorResponse, status?: number) => Promise<Response>;
}

export const ErrorMiddleware: ErrorHandler = async (err, c) => {
	// console.log(err.name, err.message);

	if (err.name === 'ZodError') {
		return c.json(
			{
				success: false,
				message: 'Validation error',
				status: 400,
				errors: err.message,
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
	const isPrismaError = String(err.name).toLowerCase().includes('prisma');
	if (isPrismaError) {
		return c.json(
			{
				success: false,
				message: err.message,
			},
			400,
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
