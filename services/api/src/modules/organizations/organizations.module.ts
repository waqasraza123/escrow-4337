import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { AuthConfigService } from '../auth/auth.config';
import { AuthGuard } from '../auth/guards/auth.guard';
import { JwtService } from '../auth/jwt';
import { SessionsService } from '../auth/sessions.service';
import { UsersModule } from '../users/users.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [PersistenceModule, UsersModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    AuthConfigService,
    JwtService,
    SessionsService,
    AuthGuard,
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
