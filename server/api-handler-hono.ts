import { Env } from './types';
import { app } from './hono-api';
import type { ExecutionContext } from '@cloudflare/workers-types';

/**
 * Handle API requests by passing them through our Hono app
 */
export async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  return app.fetch(request, env, ctx);
}