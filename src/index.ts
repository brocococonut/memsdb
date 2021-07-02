
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
export { SessionStorageBackup } from './backupProviders/sessionStorage'
export { FSBackup } from './backupProviders/fs'
export { VoidBackup } from './backupProviders/void'

// Storage classes
export { LocalStorage } from './storageProviders/localStorage'
export { MemoryStorage } from './storageProviders/memory'
export { SessionStorage } from './storageProviders/sessionStorage'

// Exported types
export type {
  EventDBBackup,
  EventDBHandlerAdded,
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
  EventCollectionDocumentUpdated,
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
