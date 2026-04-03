import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType>
  implements PipeTransform<unknown, z.output<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.map(String).join('.'),
        code: i.code,
        message: i.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        issues,
      });
    }

    return parsed.data as z.output<TSchema>;
  }
}
