import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { PersistenceConfigService } from '../persistence.config';

@Injectable()
export class PostgresDatabaseService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor(config: PersistenceConfigService) {
    this.pool =
      config.driver === 'postgres'
        ? new Pool({
            connectionString: config.databaseUrl,
            ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
          })
        : null;
  }

  async query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    if (!this.pool) {
      throw new Error('Postgres driver is not enabled');
    }
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(handler: (client: PoolClient) => Promise<T>) {
    if (!this.pool) {
      throw new Error('Postgres driver is not enabled');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
