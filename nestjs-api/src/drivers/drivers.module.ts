import { Module } from "@nestjs/common";

import { DriverAuthGuard } from "./driver-auth.guard";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  controllers: [DriversController],
  providers: [DriversService, DriverAuthGuard],
})
export class DriversModule {}
