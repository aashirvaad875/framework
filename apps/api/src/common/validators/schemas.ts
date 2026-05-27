import Joi from 'joi';
import z from 'zod';

// CREATE USER
export const CreateUserJoiSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      'string.email': 'Email must be valid',
      'any.required': 'Email is required',
    }),
  name: Joi.string().min(2).max(100).required(),
  age: Joi.number().optional().min(0).max(150),
});

export const CreateUserZodSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

// UPDATE USER
export const UpdateUserJoiSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(2).max(100).optional(),
  age: Joi.number().optional().min(0).max(150),
}).min(1);

export const UpdateUserZodSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(2).max(100).optional(),
    age: z.number().int().min(0).max(150).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

// QUERY/SEARCH USERS
export const QueryUsersJoiSchema = Joi.object({
  search: Joi.string().optional().max(100),
  page: Joi.number().optional().min(1),
  limit: Joi.number().optional().min(1).max(100),
  sort: Joi.string()
    .optional()
    .valid('name', 'email', '-name', '-email'),
});

export const QueryUsersZodSchema = z.object({
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort: z
    .enum(['name', 'email', '-name', '-email'])
    .optional(),
});

// HEALTH CHECK
export const HealthCheckJoiSchema = Joi.object({
  check: Joi.string().optional().valid('full', 'basic'),
});

export const HealthCheckZodSchema = z.object({
  check: z.enum(['full', 'basic']).optional(),
});
