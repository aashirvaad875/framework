import Joi from 'joi';
import z from 'zod';

export class HealthCheckDto {
  check?: 'full' | 'basic';
}

export const HealthCheckJoiSchema = Joi.object({
  check: Joi.string().optional().valid('full', 'basic'),
});

export const HealthCheckZodSchema = z.object({
  check: z.enum(['full', 'basic']).optional(),
});
