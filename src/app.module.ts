import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PilotModule } from './infrastructure/pilot.module.js';

@Module({
  imports: [PilotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
