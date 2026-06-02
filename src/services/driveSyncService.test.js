import { beforeEach, describe, expect, it, vi } from 'vitest';

const driveMocks = vi.hoisted(() => ({
  deleteFile: vi.fn(),
  ensureGroupFolder: vi.fn(),
  getFile: vi.fn(),
  renameFile: vi.fn(),
  updateDocxContent: vi.fn(),
  uploadDocxAsGoogleDoc: vi.fn(),
}));

const resumeMocks = vi.hoisted(() => ({
  getDriveCleanupQueue: vi.fn(),
  getResumeGroup: vi.fn(),
  removeDriveCleanup: vi.fn(),
  updateGroupDriveFolder: vi.fn(),
  updateResumeDriveSync: vi.fn(),
}));

vi.mock('./googleDriveService', async (importOriginal) => ({
  ...(await importOriginal()),
  ...driveMocks,
}));
vi.mock('./exportService', () => ({
  generateDocxBlob: vi.fn(async () => new Blob(['resume'], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })),
}));
vi.mock('./resumeService', () => resumeMocks);

import { drainDriveCleanup, syncResumeToDrive, syncResumeToDriveByIds } from './driveSyncService';

const getAccessToken = vi.fn(async () => 'token');
const group = { id: 'group-1', name: 'Applications' };
const resume = { id: 'resume-1', name: 'Backend Engineer' };
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('driveSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumeMocks.getResumeGroup.mockResolvedValue(group);
    driveMocks.ensureGroupFolder.mockResolvedValue({ rootId: 'root-1', folderId: 'folder-1' });
    driveMocks.uploadDocxAsGoogleDoc.mockResolvedValue({
      id: 'file-1',
      webViewLink: 'https://docs.google.com/file-1',
    });
  });

  it('recreates a trashed mirror document', async () => {
    driveMocks.getFile.mockResolvedValueOnce({ id: 'folder-1', name: 'Applications', trashed: false });
    driveMocks.getFile.mockResolvedValueOnce({ id: 'file-old', name: 'Old', trashed: true });
    await syncResumeToDrive({
      getAccessToken,
      group: { ...group, driveFolderId: 'folder-1' },
      resume: { ...resume, driveFileId: 'file-old' },
      resumeData: {},
      sectionOrder: [],
    });
    expect(driveMocks.uploadDocxAsGoogleDoc).toHaveBeenCalledOnce();
    expect(resumeMocks.updateResumeDriveSync).toHaveBeenCalledWith('resume-1', expect.objectContaining({ driveFileId: 'file-1' }));
  });

  it('recreates a trashed group folder', async () => {
    driveMocks.getFile.mockResolvedValueOnce({ id: 'folder-old', name: 'Applications', trashed: true });
    await syncResumeToDrive({
      getAccessToken,
      group: { ...group, driveFolderId: 'folder-old' },
      resume,
      resumeData: {},
      sectionOrder: [],
    });
    expect(driveMocks.ensureGroupFolder).toHaveBeenCalledWith(getAccessToken, 'Applications');
    expect(resumeMocks.updateGroupDriveFolder).toHaveBeenCalledWith('group-1', {
      driveFolderId: 'folder-1',
      driveRootId: 'root-1',
    });
  });

  it('reconciles renamed folders and mirror documents on sync', async () => {
    driveMocks.getFile.mockResolvedValueOnce({ id: 'folder-1', name: 'Old Group', trashed: false });
    driveMocks.getFile.mockResolvedValueOnce({
      id: 'file-1',
      name: 'Old Resume',
      trashed: false,
      webViewLink: 'https://docs.google.com/file-1',
    });
    await syncResumeToDrive({
      getAccessToken,
      group: { ...group, driveFolderId: 'folder-1' },
      resume: { ...resume, driveFileId: 'file-1' },
      resumeData: {},
      sectionOrder: [],
    });
    expect(driveMocks.renameFile).toHaveBeenNthCalledWith(1, getAccessToken, 'folder-1', 'Applications');
    expect(driveMocks.renameFile).toHaveBeenNthCalledWith(2, getAccessToken, 'file-1', 'Backend Engineer');
  });

  it('coalesces overlapping first uploads without creating duplicate Docs', async () => {
    let releaseUpload;
    driveMocks.uploadDocxAsGoogleDoc.mockImplementationOnce(() => new Promise((resolve) => {
      releaseUpload = () => resolve({ id: 'file-1', webViewLink: 'https://docs.google.com/file-1' });
    }));
    driveMocks.getFile.mockResolvedValue({ id: 'file-1', name: 'Backend Engineer', trashed: false });

    const first = syncResumeToDriveByIds({ getAccessToken, groupId: 'group-1', resume, resumeData: { version: 1 }, sectionOrder: [] });
    const second = syncResumeToDriveByIds({ getAccessToken, groupId: 'group-1', resume, resumeData: { version: 2 }, sectionOrder: [] });
    while (!releaseUpload) await nextTick();
    releaseUpload();
    await Promise.all([first, second]);

    expect(driveMocks.uploadDocxAsGoogleDoc).toHaveBeenCalledTimes(1);
    expect(driveMocks.updateDocxContent).toHaveBeenCalledTimes(1);
  });

  it('drains queued document deletions after authorization', async () => {
    resumeMocks.getDriveCleanupQueue.mockResolvedValue([{ id: 'file-old' }]);
    await drainDriveCleanup({ getAccessToken, userId: 'user-1' });
    expect(driveMocks.deleteFile).toHaveBeenCalledWith(getAccessToken, 'file-old');
    expect(resumeMocks.removeDriveCleanup).toHaveBeenCalledWith('user-1', 'file-old');
  });
});
