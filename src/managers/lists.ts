/**
 * ListsManager - Handles Bluesky list operations
 * 
 * Features:
 * - Create, update, delete lists
 * - Add/remove members from lists
 * - Get list details and members
 * - Subscribe/unsubscribe to lists
 */

import { BskyAgent } from '@atproto/api';

export type ListPurpose = 'curatelist' | 'modlist';

export interface List {
  uri: string;
  cid: string;
  name: string;
  purpose: ListPurpose;
  description?: string;
  avatar?: string;
  creator: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  indexedAt: string;
  listItemCount?: number;
}

export interface ListMember {
  uri: string;
  subject: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface CreateListInput {
  name: string;
  purpose: ListPurpose;
  description?: string;
  avatar?: Blob;
}

export class ListsManager {
  constructor(private agent: BskyAgent) {}

  /**
   * Create a new list
   */
  async createList(input: CreateListInput): Promise<{ uri: string; cid: string }> {
    const { name, purpose, description, avatar } = input;

    let avatarRef;
    if (avatar) {
      const response = await this.agent.uploadBlob(avatar, {
        encoding: avatar.type || 'image/jpeg',
      });
      avatarRef = response.data.blob;
    }

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session?.did || '',
      collection: 'app.bsky.graph.list',
      record: {
        $type: 'app.bsky.graph.list',
        purpose: purpose === 'curatelist' 
          ? 'app.bsky.graph.defs#curatelist' 
          : 'app.bsky.graph.defs#modlist',
        name,
        description,
        avatar: avatarRef,
        createdAt: new Date().toISOString(),
      },
    });

    return { uri: response.data.uri, cid: response.data.cid };
  }

  /**
   * Delete a list
   */
  async deleteList(listUri: string): Promise<void> {
    const { rkey } = this.parseUri(listUri);
    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session?.did || '',
      collection: 'app.bsky.graph.list',
      rkey,
    });
  }

  /**
   * Get a list by URI
   */
  async getList(listUri: string): Promise<List> {
    const response = await this.agent.app.bsky.graph.getList({
      list: listUri,
      limit: 1,
    });

    return this.mapList(response.data.list);
  }

  /**
   * Get lists created by a user
   */
  async getLists(
    actor: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ lists: List[]; cursor?: string }> {
    const { limit = 50, cursor } = options;

    const response = await this.agent.app.bsky.graph.getLists({
      actor,
      limit,
      cursor,
    });

    return {
      lists: response.data.lists.map(this.mapList),
      cursor: response.data.cursor,
    };
  }

  /**
   * Get members of a list
   */
  async getListMembers(
    listUri: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ members: ListMember[]; cursor?: string }> {
    const { limit = 100, cursor } = options;

    const response = await this.agent.app.bsky.graph.getList({
      list: listUri,
      limit,
      cursor,
    });

    return {
      members: response.data.items.map((item) => ({
        uri: item.uri,
        subject: {
          did: item.subject.did,
          handle: item.subject.handle,
          displayName: item.subject.displayName,
          avatar: item.subject.avatar,
        },
      })),
      cursor: response.data.cursor,
    };
  }

  /**
   * Add a member to a list
   */
  async addMember(listUri: string, subjectDid: string): Promise<{ uri: string }> {
    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session?.did || '',
      collection: 'app.bsky.graph.listitem',
      record: {
        $type: 'app.bsky.graph.listitem',
        subject: subjectDid,
        list: listUri,
        createdAt: new Date().toISOString(),
      },
    });

    return { uri: response.data.uri };
  }

  /**
   * Remove a member from a list
   */
  async removeMember(listItemUri: string): Promise<void> {
    const { rkey } = this.parseUri(listItemUri);
    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session?.did || '',
      collection: 'app.bsky.graph.listitem',
      rkey,
    });
  }

  /**
   * Add multiple members to a list
   */
  async addMembers(listUri: string, subjectDids: string[]): Promise<{ uri: string }[]> {
    const results: { uri: string }[] = [];
    
    for (const did of subjectDids) {
      const result = await this.addMember(listUri, did);
      results.push(result);
    }

    return results;
  }

  /**
   * Mute a list (for modlists)
   */
  async muteList(listUri: string): Promise<void> {
    await this.agent.muteModList(listUri);
  }

  /**
   * Unmute a list
   */
  async unmuteList(listUri: string): Promise<void> {
    await this.agent.unmuteModList(listUri);
  }

  /**
   * Block a list (for modlists)
   */
  async blockList(listUri: string): Promise<{ uri: string }> {
    const response = await this.agent.blockModList(listUri);
    return { uri: response.uri };
  }

  /**
   * Unblock a list
   */
  async unblockList(blockUri: string): Promise<void> {
    await this.agent.unblockModList(blockUri);
  }

  /**
   * Get lists the user is subscribed to (muted/blocked)
   */
  async getListMutes(
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ lists: List[]; cursor?: string }> {
    const { limit = 50, cursor } = options;

    const response = await this.agent.app.bsky.graph.getListMutes({
      limit,
      cursor,
    });

    return {
      lists: response.data.lists.map(this.mapList),
      cursor: response.data.cursor,
    };
  }

  /**
   * Get lists the user has blocked
   */
  async getListBlocks(
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ lists: List[]; cursor?: string }> {
    const { limit = 50, cursor } = options;

    const response = await this.agent.app.bsky.graph.getListBlocks({
      limit,
      cursor,
    });

    return {
      lists: response.data.lists.map(this.mapList),
      cursor: response.data.cursor,
    };
  }

  private mapList(data: any): List {
    return {
      uri: data.uri,
      cid: data.cid,
      name: data.name,
      purpose: data.purpose?.includes('modlist') ? 'modlist' : 'curatelist',
      description: data.description,
      avatar: data.avatar,
      creator: {
        did: data.creator.did,
        handle: data.creator.handle,
        displayName: data.creator.displayName,
        avatar: data.creator.avatar,
      },
      indexedAt: data.indexedAt,
      listItemCount: data.listItemCount,
    };
  }

  private parseUri(uri: string): { repo: string; collection: string; rkey: string } {
    const parts = uri.replace('at://', '').split('/');
    return {
      repo: parts[0],
      collection: parts[1],
      rkey: parts[2],
    };
  }
}
