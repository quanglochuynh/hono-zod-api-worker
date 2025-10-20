import { Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";

export const AuthMiddleware = async (c: Context, next: any) => {
  const apiKey = c.env.BEARER_TOKEN;

  const authFunction = bearerAuth({
    token: apiKey,
    invalidTokenMessage: {
      error: "Unauthorized",
    },
  });

  await authFunction(c, next);
};
