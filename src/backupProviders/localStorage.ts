import { existsSync, mkdirSync } from 'fs';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { Backup, BackupProvider } from '.';

interface FSBackupOpts {
  saveDirectory?: string
  filenameFormat?: string
  backupLimit?: number
}

/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 */
export class LocalStorageBackup implements BackupProvider {
  constructor() {}

  load() {
    const backup = localStorage.getItem('memsdb')

    if (backup) return JSON.parse(backup)
    else return {}
  }

  save(backup: Backup) {
    localStorage.setItem('memsdb', JSON.stringify(backup))

    return true
  }
}