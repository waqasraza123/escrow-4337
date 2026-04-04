import { Global, Module } from '@nestjs/common';
import {
  FileEscrowRepository,
  FileOtpRepository,
  FileSessionsRepository,
  FileUsersRepository,
} from './file/file.repositories';
import { FilePersistenceStore } from './file/file-persistence.store';
import { PersistenceConfigService } from './persistence.config';
import {
  ESCROW_REPOSITORY,
  OTP_REPOSITORY,
  SESSIONS_REPOSITORY,
  USERS_REPOSITORY,
} from './persistence.tokens';
import { PostgresDatabaseService } from './postgres/postgres-database.service';
import {
  PostgresEscrowRepository,
  PostgresOtpRepository,
  PostgresSessionsRepository,
  PostgresUsersRepository,
} from './postgres/postgres.repositories';

@Global()
@Module({
  providers: [
    PersistenceConfigService,
    FilePersistenceStore,
    PostgresDatabaseService,
    {
      provide: USERS_REPOSITORY,
      inject: [
        PersistenceConfigService,
        FilePersistenceStore,
        PostgresDatabaseService,
      ],
      useFactory: (
        config: PersistenceConfigService,
        fileStore: FilePersistenceStore,
        db: PostgresDatabaseService,
      ) =>
        config.driver === 'file'
          ? new FileUsersRepository(fileStore)
          : new PostgresUsersRepository(db),
    },
    {
      provide: OTP_REPOSITORY,
      inject: [
        PersistenceConfigService,
        FilePersistenceStore,
        PostgresDatabaseService,
      ],
      useFactory: (
        config: PersistenceConfigService,
        fileStore: FilePersistenceStore,
        db: PostgresDatabaseService,
      ) =>
        config.driver === 'file'
          ? new FileOtpRepository(fileStore)
          : new PostgresOtpRepository(db),
    },
    {
      provide: SESSIONS_REPOSITORY,
      inject: [
        PersistenceConfigService,
        FilePersistenceStore,
        PostgresDatabaseService,
      ],
      useFactory: (
        config: PersistenceConfigService,
        fileStore: FilePersistenceStore,
        db: PostgresDatabaseService,
      ) =>
        config.driver === 'file'
          ? new FileSessionsRepository(fileStore)
          : new PostgresSessionsRepository(db),
    },
    {
      provide: ESCROW_REPOSITORY,
      inject: [
        PersistenceConfigService,
        FilePersistenceStore,
        PostgresDatabaseService,
      ],
      useFactory: (
        config: PersistenceConfigService,
        fileStore: FilePersistenceStore,
        db: PostgresDatabaseService,
      ) =>
        config.driver === 'file'
          ? new FileEscrowRepository(fileStore)
          : new PostgresEscrowRepository(db),
    },
  ],
  exports: [
    PersistenceConfigService,
    USERS_REPOSITORY,
    OTP_REPOSITORY,
    SESSIONS_REPOSITORY,
    ESCROW_REPOSITORY,
  ],
})
export class PersistenceModule {}
