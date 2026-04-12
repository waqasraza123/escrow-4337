import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { PersistenceConfigService } from '../persistence.config';

type SearchPathQueryable = {
  query<T extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

@Injectable()
export class PostgresDatabaseService implements OnModuleDestroy {
  private pool: Pool | null = null;

  constructor(private readonly config: PersistenceConfigService) {}

  private getPool() {
    if (this.config.driver !== 'postgres') {
      return null;
    }

    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.config.databaseUrl,
        ssl: this.config.databaseSsl
          ? { rejectUnauthorized: false }
          : undefined,
      });
    }

    return this.pool;
  }

  private async applySearchPath(client: SearchPathQueryable) {
    const schema = this.config.databaseSchema;
    if (!schema) {
      return;
    }

    await client.query(`SET search_path TO "${schema}", public`);
  }

  async query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    const pool = this.getPool();
    if (!pool) {
      throw new Error('Postgres driver is not enabled');
    }

    const client = await pool.connect();
    try {
      await this.applySearchPath(client);
      return await client.query<T>(text, values);
    } finally {
      client.release();
    }
  }

  async transaction<T>(handler: (client: PoolClient) => Promise<T>) {
    const pool = this.getPool();
    if (!pool) {
      throw new Error('Postgres driver is not enabled');
    }

    const client = await pool.connect();

    try {
      await this.applySearchPath(client);
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

  async connect() {
    const pool = this.getPool();
    if (!pool) {
      throw new Error('Postgres driver is not enabled');
    }

    const client = await pool.connect();
    try {
      await this.applySearchPath(client);
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
