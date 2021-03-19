import { DBCollection } from "../collection";
import { DBDoc } from "../doc";
import { QueryBuilder } from "../utils/query";
import { Query } from "./query";
import { Backup } from "./backupProvider";
import { CustomPopulateQuery } from "../types";

export type EventName =
  | 'EventDBBackup'
  | 'EventDBRestore'
  | 'EventDBAddCollection'
  | 'EventDBDeleteCollection'
  | 'EventDBDeleteCollectionComplete'
  | 'EventDBEmptyCollection'
  | 'EventDBEmptyCollectionComplete'
  | 'EventCollectionFind'
  | 'EventCollectionFindComplete'
  | 'EventCollectionInsert'
  | 'EventCollectionInsertComplete'
  | 'EventCollectionToJSON'
  | 'EventDocumentDelete'
  | 'EventDocumentDeleteComplete'
  | 'EventDocumentCustomPopulate'
  | 'EventDocumentCustomPopulateComplete'
  | 'EventDocumentTree'
  | 'EventDocumentTreeComplete'
  | 'EventDocumentClone'
  | 'EventDocumentCloneComplete'
  | 'EventDocumentToJSON'

interface EventDBBackup {
  /**
   * Fires whenever the db.backup() function is called. Plugins will run BEFORE
   * the BackupProvider writes the structured Backup to disk (or elsewhere).
   */
  event: Extract<EventName, 'EventDBBackup'>
  /**
   * The Backup object that will be written to the BackupProvider. Mutations
   * here will effect what's written to the BackupProvider.
   */
  backup: Backup
}

interface EventDBRestore {
  /**
   * Fires whenever the db.restore() function is called. Plugins will be run
   * after the BackupProvider loads the content, and before it gets applied to
   * the database.
   */
  event: Extract<EventName, 'EventDBRestore'>
  /**
   * The Backup object that will be restored to the database. Mutations
   * here will be written to the database
   */
  backup: Backup
}

interface EventDBAddCollection {
  /**
   * Fires when a collection is added to the database.
   */
  event: Extract<EventName, 'EventDBAddCollection'>
  /**
   * A reference to the added collection. Mutate or read as necessary
   */
  collection: DBCollection
}

interface EventDBDeleteCollection {
  /**
   * Fires when a collection is about to bedeleted from the database.
   */
  event: Extract<EventName, 'EventDBDeleteCollection'>
  /**
   * A reference to the collection about to be deleted.
   */
  collection: DBCollection
}

interface EventDBDeleteCollectionComplete {
  /**
   * Fires when a collection is deleted from the database.
   */
  event: Extract<EventName, 'EventDBDeleteCollectionComplete'>
  /**
   * The name of the collection deleted
   */
  name: string
}

interface EventDBEmptyCollection {
  /**
   * Fires when the DB goes to clear a collection.
   */
  event: Extract<EventName, 'EventDBEmptyCollection'>
  /**
   * A reference to the collection 
   */
  collection: DBCollection
}

interface EventDBEmptyCollectionComplete {
  /**
   * Fires when the DB is finished clearing a collection
   */
  event: Extract<EventName, 'EventDBEmptyCollectionComplete'>
  collection: DBCollection
}

interface EventCollectionFind {
  /**
   * Fires at the start of find function from a collection. This includes the
   * col.id() function.
   */
  event: Extract<EventName, 'EventCollectionFind'>
  /**
   * A reference to the query array or QueryBuilder class that's about to be
   * performed. Modify these to adjust what results are returned
   */
  queries: Query[] | QueryBuilder
}

interface EventCollectionFindComplete {
  /**
   * Fires at the end of find function from a collection. This includes the
   * col.id() function.
   */
  event: Extract<EventName, 'EventCollectionFindComplete'>
  /**
   * A reference to the results array returned from the queries. Adjust this
   * to modify what gets returned
   */
  docs: DBDoc[]
}

interface EventCollectionInsert {
  /**
   * Run before a document is inserted. This allows you to modify the data
   * inserted, bypassing the collection schema. 
   */
  event: Extract<EventName, 'EventCollectionInsert'>
  /**
   * Data to be used in the creation of a doc on a collection. Mutating this
   * will change what gets written. If you add keys in this step that aren't
   * in the collection schema, they will be omitted from backups.
   */
  data: { [key: string]: any }
}

interface EventCollectionInsertComplete {
  /**
   * Fired after a document is inserted into the collection.
   */
  event: Extract<EventName, 'EventCollectionInsertComplete'>
  /**
   * A reference to the inserted document. Mutations here will persist.
   * If you add keys in this step that aren't in the collection schema,
   * they will be omitted from backups.
   */
  doc: DBDoc
}

interface EventCollectionToJSON {
  /**
   * Fired after a collection is converted to a string. To prevent an entire
   * collection from being converted, the toJSON function has been replaced
   * with one that simply outputs "(DBCollection<CollectionName>)".
   */
  event: Extract<EventName, 'EventCollectionToJSON'>
  /**
   * String that was originally going to be returned. Return this or something
   * else to modify the output
   */
  str: string
}

interface EventDocumentDelete {
  /**
   * Fired when a document has its .delete() method called.
   */
  event: Extract<EventName, 'EventDocumentDelete'>
  /**
   * A reference to the document before it gets removed from the collection and
   * deleted
   */
  doc: DBDoc
}

interface EventDocumentDeleteComplete {
  /**
   * Fired after a document has finished deleting itself
   */
  event: Extract<EventName, 'EventDocumentDeleteComplete'>
  /**
   * The ID of the document that was just deleted
   */
  id: string
}

interface EventDocumentCustomPopulate {
  /**
   * Fired when the .customPopulate() function is run on a document.
   */
  event: Extract<EventName, 'EventDocumentCustomPopulate'>
  /**
   * The CustomPopulateQuery object about to be used. Modify this to
   * alter the outcome of the populate function
   */
  query: {
    srcField: string;
    targetField?: string;
    targetCol: DBCollection;
    query?: Query[] | QueryBuilder;
    destinationField?: string;
    unwind?: boolean;
  }
}

interface EventDocumentCustomPopulateComplete {
  /**
   * Fired when the .customPopulate() function is run on a document.
   */
  event: Extract<EventName, 'EventDocumentCustomPopulateComplete'>
  /**
   * The cloned document with the applied mutations. Changes to
   * this document don't persist to the original.
   */
  doc: DBDoc
}

interface EventDocumentTree {
  /**
   * Fired when the .tree() function is called on a document.
   */
  event: Extract<EventName, 'EventDocumentTree'>
  /**
   * The array of queries to run for the tree function. Mutations will change
   * the outcome of the tree()
   */
  query: CustomPopulateQuery[]
}

interface EventDocumentTreeComplete {
  /**
   * Fired when the .tree() function has finished running on a document
   */
  event: Extract<EventName, 'EventDocumentTreeComplete'>
  /**
   * The cloned document with the applied mutations. Changes to
   * this document don't persist to the original.
   */
  doc: DBDoc
}

interface EventDocumentClone {
  /**
   * Fired when a document is cloned.
   */
  event: Extract<EventName, 'EventDocumentClone'>
  /**
   * The original document, mutations will persist and will be cloned
   */
  doc: DBDoc
}

interface EventDocumentCloneComplete {
  /**
   * Fired after a document is cloned.
   */
  event: Extract<EventName, 'EventDocumentCloneComplete'>
  /**
   * The cloned document. Changes to this document won't persist/reflect on the
   * original document
   */
  doc: DBDoc
}

interface EventDocumentToJSON {
  /**
   * Fired when the toJSON (JSON.stringify()) function is run on a document.
   */
  event: Extract<EventName, 'EventDocumentToJSON'>
  /**
   * The string that is to be returned. Returning something else from this
   * function will force the toJSON function to output something else entirely
   */
  str: string
}

export type MemsDBEvent = 
  | EventDBBackup
  | EventDBRestore
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
  | EventDocumentCustomPopulate
  | EventDocumentCustomPopulateComplete
  | EventDocumentTree
  | EventDocumentTreeComplete
  | EventDocumentClone
  | EventDocumentCloneComplete
  | EventDocumentToJSON

export type Plugin = (
  event: MemsDBEvent
) => any | void

// const plug: Plugin = async (ev) => {
//   (<EventDocumentDelete>ev)
//   switch (ev.event) {
//     case 'EventCollectionToJSON':
//       break;

//     default:
//       break;
//   }
// }