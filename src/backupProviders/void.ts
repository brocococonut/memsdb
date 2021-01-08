import { BackupProvider } from "."

/**
 * Send backups to the void, and retrieve nothing
 */
export class VoidBackup implements BackupProvider {
  constructor() {}

  /**
   * Return nothing
   */
  load() {
    return {}
  }

  /**
   * Void save
   */
  save() {
    return true
  }
}