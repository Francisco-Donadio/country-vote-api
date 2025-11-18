import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './services/database.service';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
  providers: [DatabaseService, LoggerService],
  exports: [DatabaseService, LoggerService],
})
export class SharedModule {}
