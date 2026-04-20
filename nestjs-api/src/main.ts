import { config } from "dotenv";
import { resolve } from "path";

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";

import { AppModule } from "./app.module";

config({ path: resolve(__dirname, "..", "..", ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.setGlobalPrefix("api");
  const port = Number(process.env.NEST_QUOTE_PORT ?? 3001);
  await app.listen(port);
  Logger.log(
    `API http://127.0.0.1:${port} — public quote/book, partner quote/book-account, drivers/*, payments/create-intent, payments/checkout-status, webhooks/stripe, webhooks/dispatch`,
    "Bootstrap",
  );
}

bootstrap();
