/**
 * Database Migration System for Skymarshal
 *
 * Handles schema versioning and safe upgrades of the IndexedDB database.
 * Migrations are run automatically during database initialization when
 * the version number changes.
 *
 * @module database/migrations
 */
import type { DatabaseSchema } from './schema.js';
/**
 * Migration function signature
 */
export interface DBMigration {
    version: number;
    name: string;
    description?: string;
    migrate: (db: IDBDatabase, transaction: IDBTransaction) => void;
}
/**
 * Migration definitions
 *
 * Each migration represents a version change and the operations
 * needed to upgrade the database schema.
 */
export declare const migrations: DBMigration[];
/**
 * Run database migrations
 *
 * Executes all migrations needed to upgrade from oldVersion to newVersion.
 * For version 0 (new database), creates all object stores from schema.
 * For upgrades, runs incremental migrations.
 *
 * @param db - Database instance
 * @param oldVersion - Current database version (0 if new)
 * @param newVersion - Target database version
 * @param schema - Database schema definition
 */
export declare function runMigrations(db: IDBDatabase, oldVersion: number, newVersion: number, schema: DatabaseSchema): void;
/**
 * Get the latest migration version
 *
 * @returns Highest migration version number
 */
export declare function getLatestVersion(): number;
/**
 * Check if a migration exists for a given version
 *
 * @param version - Version number to check
 * @returns True if migration exists
 */
export declare function hasMigration(version: number): boolean;
/**
 * Get migration by version number
 *
 * @param version - Version number
 * @returns Migration definition or undefined
 */
export declare function getMigration(version: number): DBMigration | undefined;
/**
 * Validate that migrations are properly ordered
 *
 * Ensures no duplicate versions and that versions are sequential.
 *
 * @throws Error if migrations are invalid
 */
export declare function validateMigrations(): void;
//# sourceMappingURL=migrations.d.ts.map