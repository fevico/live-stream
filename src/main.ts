import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Enable CORS globally for all HTTP routes
  app.enableCors({
    origin: '*',                    // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,              // Allow cookies/credentials if needed later
    allowedHeaders: 'Content-Type, Authorization, Accept',
    exposedHeaders: 'Content-Length, X-Content-Type-Options',
    maxAge: 86400,                  // Cache preflight for 24 hours
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
