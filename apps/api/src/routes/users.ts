import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  createUserSchema,
  type EntityId,
  ErrorCode,
  HttpStatus,
  listUsersQuerySchema,
  uuidParamSchema,
} from "@myself/shared";
import type { AppEnv } from "../types";
import { defaultHook } from "../lib/validator";
import { ok, fail } from "../lib/response";
import { buildPaginated } from "../lib/pagination";
import { UserService } from "../services/user.service";

export const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "List users",
  description: "Returns a paginated list of application users.",
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    [HttpStatus.OK]: {
      description: "Paginated users response",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Invalid query parameters",
    },
  },
});

export const getUserByIdRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Users"],
  summary: "Get user by ID",
  description: "Retrieves a user profile by their unique EntityId UUID.",
  request: {
    params: uuidParamSchema,
  },
  responses: {
    [HttpStatus.OK]: {
      description: "User found",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Invalid UUID format",
    },
    [HttpStatus.NOT_FOUND]: {
      description: "User not found",
    },
  },
});

export const createUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Create user",
  description: "Registers a new user profile with unique email.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createUserSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.CREATED]: {
      description: "User created successfully",
    },
    [HttpStatus.BAD_REQUEST]: {
      description: "Validation error",
    },
    [HttpStatus.CONFLICT]: {
      description: "Email already exists",
    },
  },
});

export const usersRoute = new OpenAPIHono<AppEnv>({ defaultHook })
  .openapi(listUsersRoute, async (c) => {
    const { limit, offset } = c.req.valid("query");
    const service = new UserService(c.var.userRepo);
    const { items, total } = await service.list({ limit, offset });

    return ok(c, buildPaginated(items, total, limit, offset));
  })
  .openapi(getUserByIdRoute, async (c) => {
    const { id } = c.req.valid("param");
    const service = new UserService(c.var.userRepo);
    const user = await service.findById(id as EntityId);

    if (!user) {
      return fail(
        c,
        "User not found",
        HttpStatus.NOT_FOUND,
        ErrorCode.ENTITY_NOT_FOUND,
      );
    }

    return ok(c, user);
  })
  .openapi(createUserRoute, async (c) => {
    const body = c.req.valid("json");
    const service = new UserService(c.var.userRepo);
    const newUser = await service.create({
      name: body.name,
      email: body.email,
      avatarUrl: body.avatarUrl,
    });

    return ok(c, newUser, HttpStatus.CREATED);
  });
