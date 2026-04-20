"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, "..", "..", ".env") });
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.setGlobalPrefix("api");
    const port = Number(process.env.NEST_QUOTE_PORT ?? 3001);
    await app.listen(port);
    common_1.Logger.log(`Quote API listening on http://127.0.0.1:${port}/api/public/quote`, "Bootstrap");
}
bootstrap();
//# sourceMappingURL=main.js.map