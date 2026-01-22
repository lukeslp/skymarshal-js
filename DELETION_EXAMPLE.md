# DeletionManager Usage Examples

The DeletionManager provides safe deletion workflows for Bluesky content with support for batch operations, progress tracking, and error handling.

## Installation

```typescript
import { AuthManager, DeletionManager } from 'skymarshal';
// Or specific imports:
import { DeletionManager } from 'skymarshal/deletion';
import { AuthManager } from 'skymarshal/auth';
```

## Basic Usage

### Initialize with Authentication

```typescript
// Create and authenticate
const auth = new AuthManager();
await auth.login('user.bsky.social', 'app-password');

// Create deletion manager
const deletion = new DeletionManager(auth);
```

### Parse AT-URI

```typescript
// Parse an AT-URI into components
const parsed = deletion.parseAtUri('at://did:plc:xyz123/app.bsky.feed.post/abc456');
console.log(parsed);
// {
//   repo: 'did:plc:xyz123',
//   collection: 'app.bsky.feed.post',
//   rkey: 'abc456'
// }
```

### Delete Single Item

```typescript
// Simple remote deletion
const result = await deletion.safeDelete(uri, {
  deleteFromRemote: true
});

console.log(`Deleted ${result.success} items, failed: ${result.failed}`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### Delete with Confirmation

```typescript
// Request confirmation before deletion
const result = await deletion.safeDelete(uri, {
  confirmationRequired: true,
  deleteFromRemote: true
});

// Note: Confirmation logic should be handled by UI layer
// The manager will log a warning if confirmation is required
```

## Batch Operations

### Batch Delete with Progress

```typescript
const uris = [
  'at://did:plc:xyz/app.bsky.feed.post/abc123',
  'at://did:plc:xyz/app.bsky.feed.post/def456',
  'at://did:plc:xyz/app.bsky.feed.post/ghi789',
  // ... more URIs
];

const result = await deletion.batchDelete(uris, (progress) => {
  const percent = Math.round(progress * 100);
  console.log(`Progress: ${percent}%`);
});

console.log(`Batch complete: ${result.success} deleted, ${result.failed} failed`);
result.errors.forEach(({ uri, error }) => {
  console.error(`Failed to delete ${uri}: ${error}`);
});
```

### Batch Delete Without Progress

```typescript
// Simple batch delete without tracking progress
const result = await deletion.batchDelete(uris);
console.log(result);
```

## Preview Deletion (Dry Run)

```typescript
import type { ContentItem } from 'skymarshal/models';

// Get content items to delete
const items: ContentItem[] = [
  { uri: 'at://...', contentType: 'posts', /* ... */ },
  { uri: 'at://...', contentType: 'likes', /* ... */ },
  { uri: 'at://...', contentType: 'reposts', /* ... */ },
];

// Preview what would be deleted
const preview = deletion.previewDeletion(items);

console.log(`Will delete ${preview.count} items:`);
console.log(`- Posts: ${preview.breakdown.posts}`);
console.log(`- Likes: ${preview.breakdown.likes}`);
console.log(`- Reposts: ${preview.breakdown.reposts}`);
console.log(`- Replies: ${preview.breakdown.replies}`);
```

## Error Handling

### Validation Errors

```typescript
import { ValidationError } from 'skymarshal/deletion';

try {
  const parsed = deletion.parseAtUri('invalid-uri');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid AT-URI format:', error.message);
  }
}
```

### Network Errors

```typescript
import { NetworkError } from 'skymarshal/deletion';

try {
  await deletion.deleteFromRemote(uri);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error(`Network error (${error.statusCode}):`, error.message);
  }
}
```

### Authentication Errors

```typescript
// DeletionManager will throw if not authenticated
if (!auth.isAuthenticated()) {
  console.error('Must authenticate before deleting');
  await auth.login(identifier, password);
}

await deletion.deleteFromRemote(uri);
```

## Advanced Usage

### Delete with Backup

```typescript
// Note: Backup creation is planned but not yet implemented
// The option is provided for future compatibility
const result = await deletion.safeDelete(uri, {
  createBackup: true,
  backupName: 'Pre-deletion backup',
  deleteFromRemote: true
});

if (result.backupId) {
  console.log(`Backup created: ${result.backupId}`);
}
```

### Graceful 404 Handling

```typescript
// Attempting to delete an already-deleted item returns success
// (404 errors are handled gracefully)
await deletion.deleteFromRemote('at://did:plc:xyz/app.bsky.feed.post/deleted');
// No error thrown - considered successful
```

## Integration Examples

### With React State

```typescript
const [progress, setProgress] = useState(0);
const [deleting, setDeleting] = useState(false);

const handleBatchDelete = async (uris: string[]) => {
  setDeleting(true);

  const result = await deletion.batchDelete(uris, (p) => {
    setProgress(p);
  });

  setDeleting(false);
  setProgress(0);

  if (result.failed > 0) {
    alert(`Failed to delete ${result.failed} items`);
  } else {
    alert(`Successfully deleted ${result.success} items`);
  }
};
```

### With Confirmation Dialog

```typescript
const handleDelete = async (uri: string) => {
  const confirmed = window.confirm('Are you sure you want to delete this?');

  if (!confirmed) {
    return;
  }

  try {
    const result = await deletion.safeDelete(uri, {
      deleteFromRemote: true
    });

    if (result.success > 0) {
      console.log('Deleted successfully');
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

## Type Definitions

### DeletionOptions

```typescript
interface DeletionOptions {
  confirmationRequired?: boolean;  // UI should handle confirmation
  deleteFromRemote?: boolean;      // Delete from Bluesky (default: true)
  createBackup?: boolean;          // Create backup before delete
  backupName?: string;             // Optional backup name
}
```

### DeletionResult

```typescript
interface DeletionResult {
  success: number;                 // Number successfully deleted
  failed: number;                  // Number that failed
  errors: Array<{                  // Error details
    uri: string;
    error: string;
  }>;
  backupId?: string;               // Backup ID if created
}
```

### ParsedAtUri

```typescript
interface ParsedAtUri {
  repo: string;        // DID (e.g., 'did:plc:xyz123')
  collection: string;  // Collection name (e.g., 'app.bsky.feed.post')
  rkey: string;        // Record key (e.g., 'abc456')
}
```

## Best Practices

1. **Always authenticate first** - DeletionManager requires an authenticated AuthManager
2. **Use batch operations** - More efficient for deleting multiple items
3. **Handle errors gracefully** - Check result.errors array for partial failures
4. **Preview before deleting** - Use previewDeletion() for confirmation UIs
5. **Track progress** - Provide user feedback during long batch operations
6. **Validate URIs** - Use parseAtUri() to validate before attempting deletion

## Limitations

- **No local storage deletion**: Currently only supports remote deletion via AT Protocol API
- **No backup implementation**: Backup options are defined but not yet implemented
- **No undo**: Deletions are permanent - use with caution
- **Rate limiting**: Be aware of Bluesky API rate limits for batch operations
- **Sequential processing**: Batch deletes are processed sequentially (not parallel)

## Related Managers

- **ContentManager** - For fetching content to delete
- **SearchManager** - For finding content to delete
- **BackupService** - (Future) For backup/restore operations

## Further Reading

- [AT Protocol Docs](https://atproto.com/)
- [Bluesky API Reference](https://docs.bsky.app/)
- [Skymarshal Documentation](https://github.com/lukeslp/skymarshal-js)
