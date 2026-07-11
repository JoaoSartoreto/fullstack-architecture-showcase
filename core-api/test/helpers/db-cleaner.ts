import { DataSource } from 'typeorm';

export class DbCleaner {
    private readonly dataSource: DataSource;
    private readonly excludedTables: string[] = ['users', 'catalog_items'];

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Dynamically truncates all transactional tables while safeguarding core seed data.
     */
    public async clear(): Promise<void> {
        const tableNames = this.getTablesToTruncate();

        if (tableNames.length === 0) {
            return;
        }

        // Combine all tables into a single Postgres command for maximum performance
        const joinedTableNames = tableNames.map((name) => `"${name}"`).join(', ');

        // Postgres TRUNCATE is inherently transactional. CASCADE targets children, not parents.
        await this.dataSource.query(`TRUNCATE TABLE ${joinedTableNames} RESTART IDENTITY CASCADE;`);
    }

    // ----------------------------------------------------------------------
    // PRIVATE DOMAIN
    // ----------------------------------------------------------------------

    private getTablesToTruncate(): string[] {
        return this.dataSource.entityMetadatas
            .map((meta) => meta.tableName)
            .filter((tableName) => !this.excludedTables.includes(tableName));
    }
}