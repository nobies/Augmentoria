import { idb } from './idb';
import type { AssetRecord } from './idb';

export interface VersionVideoRecord {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  active: boolean;
  createdAt: number;
}

export interface MediaStorageProvider {
  listProjectAssets(projectId: string): Promise<AssetRecord[]>;
  getAsset(id: string): Promise<AssetRecord | undefined>;
  saveAsset(record: AssetRecord): Promise<void>;
  deleteAsset(id: string): Promise<void>;
  getVersionVideo(projectId: string, version: string): Promise<VersionVideoRecord | undefined>;
  saveVersionVideo(projectId: string, version: string, file: File): Promise<void>;
  assignAssetToVersion(projectId: string, version: string, assetId: string): Promise<VersionVideoRecord>;
  deleteProjectMedia(projectId: string): Promise<void>;
}

class IndexedDbMediaStorage implements MediaStorageProvider {
  async listProjectAssets(projectId: string) {
    const records = await idb.all<AssetRecord>('assets');
    return records.filter((record) => record.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt);
  }

  getAsset(id: string) {
    return idb.get<AssetRecord>('assets', id);
  }

  async saveAsset(record: AssetRecord) {
    await idb.put('assets', record);
  }

  async deleteAsset(id: string) {
    await idb.del('assets', id);
  }

  getVersionVideo(projectId: string, version: string) {
    return idb.get<VersionVideoRecord>('video', `${projectId}__${version}`);
  }

  async saveVersionVideo(projectId: string, version: string, file: File) {
    await idb.put('video', {
      id: `${projectId}__${version}`,
      name: file.name,
      type: file.type || 'video/mp4',
      blob: file,
      active: true,
      createdAt: Date.now()
    });
  }

  async assignAssetToVersion(projectId: string, version: string, assetId: string) {
    const asset = await this.getAsset(assetId);
    if (!asset || asset.projectId !== projectId || !asset.type.startsWith('video/')) {
      throw new Error('Only a video asset from this project can be assigned to a version.');
    }
    const record: VersionVideoRecord = {
      id: `${projectId}__${version}`,
      name: asset.name,
      type: asset.type || 'video/mp4',
      blob: asset.blob,
      active: true,
      createdAt: Date.now()
    };
    await idb.put('video', record);
    return record;
  }

  async deleteProjectMedia(projectId: string) {
    const [assets, videos] = await Promise.all([
      idb.all<AssetRecord>('assets'),
      idb.all<VersionVideoRecord>('video')
    ]);
    await Promise.all([
      ...assets.filter((asset) => asset.projectId === projectId).map((asset) => idb.del('assets', asset.id)),
      ...videos.filter((video) => video.id.startsWith(`${projectId}__`)).map((video) => idb.del('video', video.id))
    ]);
  }
}

export const mediaStorage: MediaStorageProvider = new IndexedDbMediaStorage();
