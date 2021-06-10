// Core DB classes
export { DB } from './db'
export { DBCollection } from './collection'
export { DBDoc } from './doc'

// Event handling
export { EventHandler } from './eventHandler'

// Querying and population
export { populate } from './utils/populate'
export { Query } from './types/query'
export { QueryBuilder } from './utils/query'

// Backup classes
export { LocalStorageBackup } from './backupProviders/localStorage'
export { FSBackup } from './backupProviders/fs'
export { VoidBackup } from './backupProviders/void'

// Exported types
export type { CustomPopulateQuery } from './types'
export type {
  EventDBBackupComplete,
  EventDBRestore,
  EventDBRestoreComplete,
  EventDBAddCollection,
  EventDBDeleteCollection,
  EventDBDeleteCollectionComplete,
  EventDBEmptyCollection,
  EventDBEmptyCollectionComplete,
  EventCollectionFind,
  EventCollectionFindComplete,
  EventCollectionInsert,
  EventCollectionInsertComplete,
  EventCollectionToJSON,
  EventDocumentDelete,
  EventDocumentDeleteComplete,
  EventDocumentCustomPopulate,
  EventDocumentCustomPopulateComplete,
  EventDocumentTree,
  EventDocumentTreeComplete,
  EventDocumentClone,
  EventDocumentCloneComplete,
} from './types/events'
