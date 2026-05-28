import Joi from 'joi';

export interface UpdateUserDto {
  email?: string;
  name?: string;
}

export const UpdateUserJoiSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(1).max(100).optional(),
}).min(1);
