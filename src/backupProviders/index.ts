/**
 * How a backup will be output by the DB and how it should be returned from
 * the load function
 */
export interface Backup {
  [key: string]: {
    keys: string[]
    values: any[][]
  }
}

type SaveFn = (backup: Backup) => boolean;
type LoadFn = () => Backup;

/**
 * The required structure for a BackupProvider to function
 */
export interface BackupProvider {
  save: SaveFn
  load: LoadFn
}