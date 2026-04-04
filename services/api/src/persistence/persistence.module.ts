import { Global, Module } from '@nestjs/common';
import {
  FileEscrowRepository,
  FileOtpRepository,
  FileOtpRequestThrottlesRepository,
  FileSessionsRepository,
  FileUsersRepository,
  FileWalletLinkChallengesRepository,
} from './file/file.repositories';
import { FilePersistenceStore } from './file/file-persistence.store';
import { PersistenceConfigService } from './persistence.config';
import {
  ESCROW_REPOSITORY,
  OTP_REPOSITORY,
  OTP_REQUEST_THROTTLES_REPOSITORY,
  SESSIONS_REPOSITORY,
  USERS_REPOSITORY,
  WALLET_LINK_CHALLENGES_REPOSITORY,
} from './persistence.tokens';
import { PostgresDatabaseService } from './postgres/postgres-database.service';
import {
  PostgresEscrowRepository,
  PostgresOtpRepository,
  PostgresOtpRequestThrottlesRepository,
  PostgresSessionsRepository,
  PostgresUsersRepository,
  PostgresWalletLinkChallengesRepository,
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
      provide: OTP_REQUEST_THROTTLES_REPOSITORY,
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
          ? new FileOtpRequestThrottlesRepository(fileStore)
          : new PostgresOtpRequestThrottlesRepository(db),
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
    {
      provide: WALLET_LINK_CHALLENGES_REPOSITORY,
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
          ? new FileWalletLinkChallengesRepository(fileStore)
          : new PostgresWalletLinkChallengesRepository(db),
    },
  ],
  exports: [
    PersistenceConfigService,
    USERS_REPOSITORY,
    OTP_REPOSITORY,
    OTP_REQUEST_THROTTLES_REPOSITORY,
    SESSIONS_REPOSITORY,
    ESCROW_REPOSITORY,
    WALLET_LINK_CHALLENGES_REPOSITORY,
  ],
})
export class PersistenceModule {}
