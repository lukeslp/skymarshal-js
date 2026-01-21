/**
 * BackupService - CAR file backup and restore operations
 * @module skymarshal-core/services/backup
 */
import { AtpAgent } from '@atproto/api';
/** Backup options */
export interface BackupOptions {
    categories?: ('posts' | 'likes' | 'reposts' | 'follows' | 'blocks')[];
    onProgress?: (progress: BackupProgress) => void;
}
/** Backup progress */
export interface BackupProgress {
    stage: 'downloading' | 'processing' | 'complete';
    bytesDownloaded?: number;
    recordsProcessed?: number;
    totalRecords?: number;
    percentage?: number;
}
/** Backup result */
export interface BackupResult {
    data: Uint8Array;
    did: string;
    timestamp: string;
    recordCount: number;
    categories: string[];
}
/** Import options */
export interface ImportOptions {
    categories?: ('posts' | 'likes' | 'reposts' | 'follows' | 'blocks')[];
    dryRun?: boolean;
    onProgress?: (progress: ImportProgress) => void;
}
/** Import progress */
export interface ImportProgress {
    stage: 'parsing' | 'importing' | 'complete';
    recordsProcessed: number;
    totalRecords: number;
    percentage: number;
    errors: string[];
}
/** Import result */
export interface ImportResult {
    success: boolean;
    recordsImported: number;
    recordsSkipped: number;
    errors: string[];
}
/** Parsed CAR record */
export interface CarRecord {
    uri: string;
    cid: string;
    collection: string;
    rkey: string;
    value: unknown;
}
/**
 * BackupService - Handles CAR file backup and restore operations
 */
export declare class BackupService {
    private agent;
    constructor(agent: AtpAgent);
    /**
     * Export user's repository as CAR file
     * @param did - User DID (defaults to current session)
     * @param options - Backup options
     */
    exportRepo(did?: string, options?: BackupOptions): Promise<BackupResult>;
    /**
     * Download backup to a file (browser environment)
     * @param did - User DID
     * @param filename - Output filename
     */
    downloadBackup(did?: string, filename?: string): Promise<void>;
    /**
     * Parse CAR file data (simplified parser)
     * Note: Full CAR parsing requires cbor and multiformats libraries
     * @param data - CAR file data
     */
    parseCarFile(data: Uint8Array): CarRecord[];
    /**
     * Import records from parsed CAR data
     * @param records - Parsed CAR records
     * @param options - Import options
     */
    importRecords(records: CarRecord[], options?: ImportOptions): Promise<ImportResult>;
    /**
     * Get backup metadata without downloading full CAR
     * @param did - User DID
     */
    getBackupInfo(did?: string): Promise<{
        did: string;
        head: string;
        rev: string;
    }>;
    /**
     * List available backups (if stored externally)
     * This is a placeholder for backup management
     */
    listBackups(): {
        filename: string;
        timestamp: string;
        size: number;
    }[];
}
export default BackupService;
//# sourceMappingURL=backup.d.ts.map