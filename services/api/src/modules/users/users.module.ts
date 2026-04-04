import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { UsersService } from './users.service';

@Module({
  imports: [PersistenceModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
