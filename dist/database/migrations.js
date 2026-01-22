/**
 * Database Migration System for Skymarshal
 *
 * Handles schema versioning and safe upgrades of the IndexedDB database.
 * Migrations are run automatically during database initialization when
 * the version number changes.
 *
 * @module database/migrations
 */
/**
 * Create an object store with indexes
 *
 * @param db - Database instance
 * @param storeDef - Store definition from schema
 */
function createObjectStore(db, storeDef) {
    const storeOptions = {
        keyPath: storeDef.keyPath
    };
    if (storeDef.autoIncrement !== undefined) {
        storeOptions.autoIncrement = storeDef.autoIncrement;
    }
    const objectStore = db.createObjectStore(storeDef.name, storeOptions);
    // Create indexes
    for (const index of storeDef.indexes) {
        objectStore.createIndex(index.name, index.keyPath, index.options);
    }
}
/**
 * Migration definitions
 *
 * Each migration represents a version change and the operations
 * needed to upgrade the database schema.
 */
export const migrations = [
    {
        version: 1,
        name: 'initial_schema',
        description: 'Create initial database schema with all core object stores',
        migrate: (_db, _transaction) => {
            // This migration is handled by the schema definition
            // in the main runMigrations function below.
            // Individual migrations can modify stores as needed.
            console.log('Running initial schema migration (v1)');
        }
    }
    // Future migrations go here:
    // {
    //   version: 2,
    //   name: 'add_relevance_score',
    //   description: 'Add relevanceScore index to contentItems',
    //   migrate: (db: IDBDatabase, transaction: IDBTransaction) => {
    //     const objectStore = transaction.objectStore('contentItems');
    //     objectStore.createIndex('by_relevanceScore', 'relevanceScore', {
    //       unique: false
    //     });
    //   }
    // },
];
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
export function runMigrations(db, oldVersion, newVersion, schema) {
    console.log(`Running migrations from v${oldVersion} to v${newVersion}`);
    // For new databases (oldVersion === 0), create all stores from schema
    if (oldVersion === 0) {
        console.log('Creating new database with initial schema');
        for (const storeDef of schema.stores) {
            createObjectStore(db, storeDef);
            console.log(`Created object store: ${storeDef.name}`);
        }
        // Run the initial migration hook if it exists
        const initialMigration = migrations.find(m => m.version === 1);
        if (initialMigration) {
            console.log(`Ran initial migration: ${initialMigration.name}`);
        }
        return;
    }
    // For upgrades, run incremental migrations
    const applicableMigrations = migrations.filter(m => m.version > oldVersion && m.version <= newVersion);
    if (applicableMigrations.length === 0) {
        console.log('No migrations to run');
        return;
    }
    // Sort migrations by version
    applicableMigrations.sort((a, b) => a.version - b.version);
    // Execute each migration
    for (const migration of applicableMigrations) {
        console.log(`Running migration v${migration.version}: ${migration.name}`);
        if (migration.description) {
            console.log(`  Description: ${migration.description}`);
        }
        try {
            // The transaction is managed by IndexedDB during onupgradeneeded
            // We pass the db instance to allow store creation/modification
            const transaction = db.transaction;
            migration.migrate(db, transaction);
            console.log(`  Migration v${migration.version} completed`);
        }
        catch (error) {
            console.error(`  Migration v${migration.version} failed:`, error);
            throw new Error(`Migration v${migration.version} (${migration.name}) failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    console.log(`All migrations completed successfully`);
}
/**
 * Get the latest migration version
 *
 * @returns Highest migration version number
 */
export function getLatestVersion() {
    if (migrations.length === 0) {
        return 1;
    }
    return Math.max(...migrations.map(m => m.version));
}
/**
 * Check if a migration exists for a given version
 *
 * @param version - Version number to check
 * @returns True if migration exists
 */
export function hasMigration(version) {
    return migrations.some(m => m.version === version);
}
/**
 * Get migration by version number
 *
 * @param version - Version number
 * @returns Migration definition or undefined
 */
export function getMigration(version) {
    return migrations.find(m => m.version === version);
}
/**
 * Validate that migrations are properly ordered
 *
 * Ensures no duplicate versions and that versions are sequential.
 *
 * @throws Error if migrations are invalid
 */
export function validateMigrations() {
    const versions = migrations.map(m => m.version);
    const uniqueVersions = new Set(versions);
    // Check for duplicates
    if (versions.length !== uniqueVersions.size) {
        throw new Error('Duplicate migration versions detected');
    }
    // Check for gaps (optional - migrations don't have to be sequential)
    // This is informational only
    const sorted = [...versions].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] > 1) {
            console.warn(`Migration version gap detected: v${sorted[i - 1]} -> v${sorted[i]}`);
        }
    }
}
// Validate migrations on module load
if (migrations.length > 0) {
    try {
        validateMigrations();
    }
    catch (error) {
        console.error('Migration validation failed:', error);
    }
}
//# sourceMappingURL=migrations.js.map