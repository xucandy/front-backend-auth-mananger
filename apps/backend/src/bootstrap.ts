import path from 'path';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { setupSwagger } from './setup-swagger';
import { AppConfigService } from './shared/services/app/app-config.service';
import { AppLoggerService } from '/@/shared/services/app/app-logger.service';
import { AppFilter } from './common/filters/app.filter';
import { TransformInterceptor as TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { useContainer } from 'class-validator';

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  // app config service
  const configService = app.get(AppConfigService);

  // reflector
  const reflector = app.get(Reflector);

  // class-validator 的 DTO 类中注入nestjs容器的依赖
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useLogger(app.get(AppLoggerService));
  app.enableCors({ origin: '*', credentials: true });
  app.useStaticAssets({ root: path.join(__dirname, '..', 'public') });

  // https://github.com/fastify/fastify-multipart/
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 1000000,
      files: 1,
    },
  });

  // 处理异常请求
  app.useGlobalFilters(new AppFilter(app.get(AppLoggerService)));

  app.useGlobalInterceptors(
    // 请求超时处理
    new TimeoutInterceptor(30000),
    // 序列化处理
    new ClassSerializerInterceptor(reflector),
    // 返回数据处理
    new TransformInterceptor(new Reflector()),
  );
  // websocket
  app.useWebSocketAdapter(new IoAdapter());

  // // 使用全局管道验证数据
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true,
  //     whitelist: true,
  //     // forbidNonWhitelisted: true, // 禁止 无装饰器验证的数据通过
  //     errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  //     exceptionFactory: (errors) =>
  //       new UnprocessableEntityException(
  //         errors.map((e) => {
  //           const rule = Object.keys(e.constraints)[0];
  //           const msg = e.constraints[rule];
  //           return `property ${e.property} validation failed: ${msg}, following constraints: ${rule}`;
  //         })[0],
  //       ),
  //   }),
  // );

  // global prefix
  const { globalPrefix, port } = configService.appConfig;
  app.setGlobalPrefix(globalPrefix);

  setupSwagger(app, configService);

  await app.listen(port, '0.0.0.0');

  // started log
  const logger = new Logger('NestApplication');
  logger.log(`Server running on ${await app.getUrl()}`);

  return app;
}
