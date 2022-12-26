import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FastifyReply } from 'fastify';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_DECORATOR_KEY } from '/@/common/decorators/skip-transform.decorator';
import { BaseResponse } from '/@/common/response.modal';

/**
 * 统一处理返回接口结果，如果不需要则添加@Keep装饰器
 */
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const isSkipTransform = this.reflector.get<boolean>(
          SKIP_TRANSFORM_DECORATOR_KEY,
          context.getHandler(),
        );
        if (isSkipTransform) return data;

        const response = context.switchToHttp().getResponse<FastifyReply>();
        response.header('Content-Type', 'application/json; charset=utf-8');
        return new BaseResponse(HttpStatus.OK, data ?? null);
      }),
    );
  }
}
