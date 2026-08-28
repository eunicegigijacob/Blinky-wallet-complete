import "./load-env";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 4001;
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5174";

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    credentials: true,
    origin: frontendOrigin.split(",").map((value) => value.trim()),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Blinky Lightning Wallet")
    .setDescription(
      "Lightning payment API for invoice creation, Blink webhooks, and payment status.",
    )
    .setVersion("1.0.0")
    .addTag("invoices")
    .addTag("payments")
    .addTag("webhooks")
    .addTag("health")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port, "0.0.0.0");
  console.log(`server running on: http://localhost:${port}`);
}

bootstrap();
