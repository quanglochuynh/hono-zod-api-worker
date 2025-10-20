import * as hono from 'hono';
import z from 'zod';
import { Body, Controller, Ctx, Get, Header, Param, Post, Query } from '../../app/decorator';

const createTodoSchema = z.object({
	title: z.string().min(1),
});

@Controller('/int/todos') // controller-level middleware
export class TodoController {
	@Get('/')
	getTodos(@Query('skip') skip?: number, @Query('limit') limit?: number) {
		console.log({ skip, limit });

		return [
			{ id: '1', title: 'Todo 1', completed: false },
			{ id: '2', title: 'Todo 2', completed: true },
		];
	}

	@Get('/:id')
	getTodoById(@Param('id') id: string, @Header('authorization') authHeader?: string) {
		console.log({ authHeader });

		return { id, title: `Todo ${id}`, completed: false };
	}

	@Post()
	createTodo(@Body(createTodoSchema) body: z.infer<typeof createTodoSchema>, @Ctx() ctx: hono.Context<{ Bindings: Env }>) {
		console.log(ctx.env.BEARER_TOKEN);

		return {
			body,
		};
	}
}
