import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 4001;

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    credentials: true,
    origin: function (origin, callback) {
      callback(null, true);
    },
  });
  await app.listen(port);

  const appUrl = (await app.getUrl()).replace("[::1]", "localhost");

  console.log("DB connected");
  console.log(`server running on: ${appUrl}/api/v1`);
}

bootstrap();
