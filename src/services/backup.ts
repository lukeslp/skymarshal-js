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
export class BackupService {
  private agent: AtpAgent;

  constructor(agent: AtpAgent) {
    this.agent = agent;
  }

  /**
   * Export user's repository as CAR file
   * @param did - User DID (defaults to current session)
   * @param options - Backup options
   */
  async exportRepo(did?: string, options: BackupOptions = {}): Promise<BackupResult> {
    const targetDid = did || this.agent.session!.did;
    const { onProgress } = options;

    onProgress?.({ stage: 'downloading' });

    // Fetch the CAR file from the PDS
    const response = await this.agent.com.atproto.sync.getRepo({
      did: targetDid,
    });

    const data = new Uint8Array(response.data as unknown as ArrayBuffer);

    onProgress?.({ 
      stage: 'processing', 
      bytesDownloaded: data.length 
    });

    // Parse to count records (basic parsing)
    let recordCount = 0;
    const categories = new Set<string>();

    // Note: Full CAR parsing requires additional libraries
    // This is a simplified version that counts based on collection patterns
    const textDecoder = new TextDecoder();
    const dataStr = textDecoder.decode(data);
    
    const collections = ['app.bsky.feed.post', 'app.bsky.feed.like', 'app.bsky.feed.repost', 
                         'app.bsky.graph.follow', 'app.bsky.graph.block'];
    
    for (const collection of collections) {
      const matches = dataStr.match(new RegExp(collection, 'g'));
      if (matches) {
        recordCount += matches.length;
        categories.add(collection.split('.').pop() || '');
      }
    }

    onProgress?.({ 
      stage: 'complete', 
      recordsProcessed: recordCount,
      percentage: 100 
    });

    return {
      data,
      did: targetDid,
      timestamp: new Date().toISOString(),
      recordCount,
      categories: Array.from(categories),
    };
  }

  /**
   * Download backup to a file (browser environment)
   * @param did - User DID
   * @param filename - Output filename
   */
  async downloadBackup(did?: string, filename?: string): Promise<void> {
    const result = await this.exportRepo(did);
    
    const blob = new Blob([result.data as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const defaultFilename = `${result.did.replace('did:plc:', '')}_${result.timestamp.split('T')[0]}.car`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse CAR file data (simplified parser)
   * Note: Full CAR parsing requires cbor and multiformats libraries
   * @param data - CAR file data
   */
  parseCarFile(data: Uint8Array): CarRecord[] {
    // This is a placeholder for full CAR parsing
    // In production, use @ipld/car and cbor libraries
    console.warn('Full CAR parsing requires additional dependencies (@ipld/car, cbor)');
    
    const records: CarRecord[] = [];
    
    // Basic detection of record types from raw data
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const dataStr = textDecoder.decode(data);
    
    // Extract AT URIs from the data
    const uriPattern = /at:\/\/did:plc:[a-z0-9]+\/app\.bsky\.[a-z.]+\/[a-z0-9]+/g;
    const matches = dataStr.match(uriPattern) || [];
    
    for (const uri of new Set(matches)) {
      const parts = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
      if (parts) {
        records.push({
          uri,
          cid: '', // Would need full parsing to get CID
          collection: parts[2],
          rkey: parts[3],
          value: {}, // Would need full parsing to get value
        });
      }
    }

    return records;
  }

  /**
   * Import records from parsed CAR data
   * @param records - Parsed CAR records
   * @param options - Import options
   */
  async importRecords(records: CarRecord[], options: ImportOptions = {}): Promise<ImportResult> {
    const { categories, dryRun = false, onProgress } = options;
    
    const errors: string[] = [];
    let recordsImported = 0;
    let recordsSkipped = 0;

    // Filter by categories if specified
    const categoryMap: Record<string, string> = {
      posts: 'app.bsky.feed.post',
      likes: 'app.bsky.feed.like',
      reposts: 'app.bsky.feed.repost',
      follows: 'app.bsky.graph.follow',
      blocks: 'app.bsky.graph.block',
    };

    const allowedCollections = categories 
      ? categories.map(c => categoryMap[c]).filter(Boolean)
      : Object.values(categoryMap);

    const filteredRecords = records.filter(r => 
      allowedCollections.includes(r.collection)
    );

    const total = filteredRecords.length;

    for (let i = 0; i < filteredRecords.length; i++) {
      const record = filteredRecords[i];
      
      onProgress?.({
        stage: 'importing',
        recordsProcessed: i + 1,
        totalRecords: total,
        percentage: Math.round(((i + 1) / total) * 100),
        errors,
      });

      if (dryRun) {
        recordsImported++;
        continue;
      }

      try {
        // Check if record already exists
        try {
          await this.agent.com.atproto.repo.getRecord({
            repo: this.agent.session!.did,
            collection: record.collection,
            rkey: record.rkey,
          });
          // Record exists, skip
          recordsSkipped++;
          continue;
        } catch {
          // Record doesn't exist, proceed with import
        }

        // Create the record
        await this.agent.com.atproto.repo.createRecord({
          repo: this.agent.session!.did,
          collection: record.collection,
          rkey: record.rkey,
          record: record.value as any,
        });

        recordsImported++;
      } catch (error) {
        errors.push(`Failed to import ${record.uri}: ${(error as Error).message}`);
      }
    }

    onProgress?.({
      stage: 'complete',
      recordsProcessed: total,
      totalRecords: total,
      percentage: 100,
      errors,
    });

    return {
      success: errors.length === 0,
      recordsImported,
      recordsSkipped,
      errors,
    };
  }

  /**
   * Get backup metadata without downloading full CAR
   * @param did - User DID
   */
  async getBackupInfo(did?: string): Promise<{
    did: string;
    head: string;
    rev: string;
  }> {
    const targetDid = did || this.agent.session!.did;
    
    const response = await this.agent.com.atproto.sync.getHead({
      did: targetDid,
    });

    return {
      did: targetDid,
      head: response.data.root,
      rev: '', // Would need additional call to get rev
    };
  }

  /**
   * List available backups (if stored externally)
   * This is a placeholder for backup management
   */
  listBackups(): { filename: string; timestamp: string; size: number }[] {
    // In a real implementation, this would list backups from storage
    console.warn('Backup listing requires external storage integration');
    return [];
  }
}

export default BackupService;
