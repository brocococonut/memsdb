import type { DBCollection } from '../collection'
import type { DBDoc } from '../doc'
import type { Backup } from './backupProvider'
import type { AddCollectionOpts } from './DB'
import type { CollectionFindOpts, CollectionInsertOpts } from './Collection'
import type { DocumentCustomPopulateOpts, DocumentTreeOpts } from './Document'
import { DB } from '../db'
import { EventHandler } from '../eventHandler'

export interface EventDBBackup {
  /**
   * Fires whenever the db.backup() function is called. Plugins will run BEFORE
   * the BackupProvider writes the structured Backup to disk (or elsewhere).
   */
  event: 'EventDBBackup'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
}
export interface EventDBHandlerAdded {
  /**
   * Fires whenever an event handler is added to the database
   */
  event: 'EventDBHandlerAdded'
  /**
   * A reference to the database itself, useful for handlers that require a reference to the DB
   */
  db: DB
  /**
   * A reference to the handler being added.
   */
  handler: EventHandler | ((event: MemsDBEvent) => void)
}
export interface EventDBBackupComplete {
  /**
   * Fires whenever the db.backup() function is called. Plugins will run AFTER
   * the BackupProvider writes the structured Backup to the designated backup provider.
   */
  event: 'EventDBBackupComplete'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
  status: 'success' | 'failed'
}
export interface EventDBRestore {
  /**
   * Fires whenever the db.restore() function is called. Plugins will be run
   * BEFORE the BackupProvider loads the content, and before it gets applied to
   * the database.
   */
  event: 'EventDBRestore'
  /**
   * The Backup object that will be restored to the database. Mutations
   * here will be written to the database
   */
  backup: Backup
}
export interface EventDBRestoreComplete {
  /**
   * Fires whenever the db.restore() function is called. Plugins will be run
   * AFTER the BackupProvider loads the content, and before it gets applied to
   * the database.
   */
  event: 'EventDBRestoreComplete'
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
}
export interface EventDBAddCollection {
  /**
   * Fires when a collection is added to the database.
   */
  event: 'EventDBAddCollection'
  /**
   * A reference to the added collection. Mutate or read as necessary
   */
  collection: DBCollection
  /**
   * Reference to the opts used for adding a collection to the database.
   * Modifying these options will modify original object
   */
  opts: AddCollectionOpts
}
export interface EventDBDeleteCollection {
  /**
   * Fires when a collection is about to be deleted from the database.
   */
  event: 'EventDBDeleteCollection'
  /**
   * A reference to the collection about to be deleted.
   */
  collection: DBCollection
}
export interface EventDBDeleteCollectionComplete {
  /**
   * Fires when a collection is deleted from the database.
   */
  event: 'EventDBDeleteCollectionComplete'
  /**
   * The name of the collection deleted
   */
  name: string
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}
export interface EventDBEmptyCollection {
  /**
   * Fires when the DB goes to clear a collection.
   */
  event: 'EventDBEmptyCollection'
  /**
   * A reference to the collection
   */
  collection: DBCollection
}
export interface EventDBEmptyCollectionComplete {
  /**
   * Fires when the DB is finished clearing a collection
   */
  event: 'EventDBEmptyCollectionComplete'
  /**
   * A reference to the collection
   */
  collection: DBCollection
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}
export interface EventCollectionFind {
  /**
   * Fires at the start of find function from a collection. This includes the
   * col.id() function.
   */
  event: 'EventCollectionFind'
  /**
   * The options provided to the find function. Mutations to this will modify
   * the results of the find function.
   */
  opts: CollectionFindOpts
}
export interface EventCollectionFindComplete {
  /**
   * Fires at the end of find function from a collection. This includes the
   * col.id() function.
   */
  event: 'EventCollectionFindComplete'
  /**
   * The options provided to the find function.
   */
  opts: CollectionFindOpts
  /**
   * A reference to the results array returned from the queries. Adjust this
   * to modify what gets returned
   */
  docs: DBDoc[]
}
export interface EventCollectionInsert {
  /**
   * Run before a document is inserted. This allows you to modify the data
   * inserted, bypassing the collection schema.
   */
  event: 'EventCollectionInsert'
  /**
   * Data to be used in the creation of a doc on a collection. Mutating this
   * will change what gets written. If you add keys in this step that aren't
   * in the collection schema, they will be omitted from backups.
   */
  opts: CollectionInsertOpts
}
export interface EventCollectionInsertComplete {
  /**
   * Fired after a document is inserted into the collection.
   */
  event: 'EventCollectionInsertComplete'
  /**
   * A reference to the inserted document. Mutations here will persist.
   * If you add keys in this step that aren't in the collection schema,
   * they will be omitted from backups.
   */
  doc: DBDoc
  /**
   * Same document as doc, this one won't trigger events when updated though
   */
  unlistenedDoc: DBDoc
  /**
   * A reference to the containing collection
   */
  collection: DBCollection
}
export interface EventCollectionToJSON {
  /**
   * Fired after a collection is converted to a string. To prevent an entire
   * collection from being converted, the toJSON function has been replaced
   * with one that simply outputs "(DBCollection<CollectionName>)".
   */
  event: 'EventCollectionToJSON'
  /**
   * String that was originally going to be returned. Modify this key to
   * adjust the output
   */
  str: string
}
export interface EventDocumentDelete {
  /**
   * Fired when a document has its .delete() method called.
   */
  event: 'EventDocumentDelete'
  /**
   * A reference to the document before it gets removed from the collection and
   * deleted
   */
  doc: DBDoc
}
export interface EventDocumentDeleteComplete {
  /**
   * Fired after a document has finished deleting itself
   */
  event: 'EventDocumentDeleteComplete'
  /**
   * The ID of the document that was just deleted
   */
  id: string
  /**
   * Whether or not the action was successful
   */
  success: boolean
  /**
   * An error as to why it wasn't successful
   */
  error?: Error
}
export interface EventDocumentCustomPopulate {
  /**
   * Fired when the .customPopulate() function is run on a document.
   */
  event: 'EventDocumentCustomPopulate'
  /**
   * The cloned document that will be modified. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc
  /**
   * The CustomPopulateQuery object about to be used. Modify this to
   * alter the outcome of the populate function
   */
  opts: DocumentCustomPopulateOpts
}
export interface EventDocumentCustomPopulateComplete {
  /**
   * Fired when the .customPopulate() function is run on a document.
   */
  event: 'EventDocumentCustomPopulateComplete'
  /**
   * The cloned document with the applied mutations. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc
  /**
   * The CustomPopulateQuery object about to be used. Modify this to
   * alter the outcome of the populate function
   */
  opts: DocumentCustomPopulateOpts
}
export interface EventDocumentTree {
  /**
   * Fired when the .tree() function is called on a document.
   */
  event: 'EventDocumentTree'
  /**
   * The cloned document that will be modified. Changes to
   * this document won't persist to the original.
   */
  doc: DBDoc

  opts: DocumentTreeOpts
}
export interface EventDocumentTreeComplete {
  /**
   * Fired when the .tree() function has finished running on a document
   */
  event: 'EventDocumentTreeComplete'
  /**
   * The cloned document with the applied mutations. Changes to
   * this document don't persist to the original.
   */
  doc: DBDoc

  opts: DocumentTreeOpts
}
export interface EventDocumentClone {
  /**
   * Fired when a document is cloned.
   */
  event: 'EventDocumentClone'
  /**
   * The original document, mutations will persist and will be cloned
   */
  doc: DBDoc
}
export interface EventDocumentCloneComplete {
  /**
   * Fired after a document is cloned.
   */
  event: 'EventDocumentCloneComplete'
  /**
   * The cloned document. Changes to this document won't persist/reflect on the
   * original document
   */
  doc: DBDoc
}
export interface EventCollectionDocumentUpdated {
  /**
   * Fired after a document is updated.
   */
  event: 'EventCollectionDocumentUpdated'
  /**
   * A reference to the modified document
   */
  doc: DBDoc
  /**
   * A reference to the containing collection
   */
  collection: DBCollection
}

export type MemsDBEvent =
  | EventDBHandlerAdded
  | EventDBBackup
  | EventDBBackupComplete
  | EventDBRestore
  | EventDBRestoreComplete
  | EventDBAddCollection
  | EventDBDeleteCollection
  | EventDBDeleteCollectionComplete
  | EventDBEmptyCollection
  | EventDBEmptyCollectionComplete
  | EventCollectionFind
  | EventCollectionFindComplete
  | EventCollectionInsert
  | EventCollectionInsertComplete
  | EventCollectionToJSON
  | EventDocumentDelete
  | EventDocumentDeleteComplete
  | EventDocumentCustomPopulate
  | EventDocumentCustomPopulateComplete
  | EventDocumentTree
  | EventDocumentTreeComplete
  | EventDocumentClone
  | EventDocumentCloneComplete
  | EventCollectionDocumentUpdated

export type EventName = Pick<MemsDBEvent, 'event'>['event']

export type EventHandlerType = (
  event: MemsDBEvent
) => (any | void) | Promise<any | void>

export type EventHandlersType = Record<
  EventName,
  EventHandlerType | EventHandlerType[] | undefined
>
