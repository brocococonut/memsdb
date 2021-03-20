import change from 'on-change'
import { DBDoc } from './doc'
import { DB } from './db'
import { Query } from './types/query'
import { SchemaTemplateType } from './types'
import { runQuery, QueryBuilder } from './utils/query'
import { updateReactiveIndex, createReactiveIndex } from './utils/reactive'
import { updateDocIndex } from './utils/indexed'
import {
  CollectionFindOpts,
  CollectionInsertManyOpts,
  CollectionInsertOpts,
} from './types/Collection'
import { MemsDBEvent } from './types/events'

/**
 * Class for creating collections of structured documents
 */
export class DBCollection {
  /** Name of the collection */
  readonly name: string
  /** Schema every document should adhere to */
  readonly schema: { [key: string]: any }
  /** Document array */
  docs: DBDoc[]
  /** Debugger variable */
  readonly col_: debug.Debugger
  /** Reference to the DB object */
  readonly db: DB
  /** Map for reactive query results */
  reactiveIndexed: Map<Query[] | QueryBuilder, { docs: DBDoc[] }> = new Map()

  /**
   * Create a structured collection of documents
   * @param db Database reference
   * @param schema Schema for content to adhere to
   */
  constructor(db: DB, schema: SchemaTemplateType) {
    this.schema = schema.structure
    this.docs = []
    this.name = schema.name

    this.col_ = db.db_.extend(`<col>${schema.name}`)
    db.addCollection(this, { replace: true })

    this.db = db
  }

  /**
   * Find a specific document by its id
   * @param idStr ID to filter by
   */
  id(idStr: string) {
    /* DEBUG */ this.col_('Finding document by id `%s`', idStr)
    const doc = this.docs.find((doc) => doc.id === idStr)
    /* DEBUG */ this.col_(
      'Document found for id:`%s` %s',
      idStr,
      doc ? 'true' : 'false'
    )
    return doc
  }

  /**
   * Run a set of queries to filter documents
   * @param queries Array of queries to run
   * @param reactive Create and keep a reactive index of the query on the collection under collection.reactive[queryArr]
   */
  find(opts: CollectionFindOpts = { queries: [], reactive: false }) {
    /* DEBUG */ this.col_('Starting find query')
    let docs: DBDoc[] = []

    /* DEBUG */ this.col_('Emitting event "EventCollectionFind"')
    this.db.emitEvent({
      event: 'EventCollectionFind',
      opts,
    })

    if (!opts.queries) {
      /* DEBUG */ this.col_('No query specified, using empty array')
      docs = runQuery([], this, this.docs)
    } else if (opts.reactive) {
      createReactiveIndex(this, opts.queries)
      docs = runQuery(opts.queries, this, this.docs)
    } else {
      docs = runQuery(opts.queries, this, this.docs)
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionFindComplete"')
    this.db.emitEvent({
      event: 'EventCollectionFindComplete',
      opts,
      docs,
    })

    /* DEBUG */ this.col_('Documents found for query: %d', docs.length)
    return docs
  }

  /**
   * Insert a new document into the array. Defaults will be loaded from the schema
   * @param opts Insert document options
   */
  insertOne(opts: CollectionInsertOpts) {
    opts = {
      reactiveUpdate: true,
      ...opts,
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionInsert"')
    this.db.emitEvent({
      event: 'EventCollectionInsert',
      opts,
    })

    /* DEBUG */ this.col_('Creating new document')

    if (opts.id) {
      /* DEBUG */ this.col_(
        "ID specified, ensuring document with ID %s doesn't already exist",
        opts.id
      )
      const oldDoc = this.id(opts.id)
      if (oldDoc) {
        /* DEBUG */ this.col_(
          'Document with ID %s exists, returning document',
          opts.id
        )
        return oldDoc
      }
      /* DEBUG */ this.col_(
        "Document with ID %s doesn't exist, continuing with document creation",
        opts.id
      )
    }

    const newDoc = new DBDoc(opts.doc, this, opts.id)
    /* DEBUG */ this.col_(
      'Created document with id: %s, pushing to collection',
      newDoc.id
    )

    /**
     * Create a listened/proxied version of the document to adjust indexes and
     * reactive indexes automatically
     */
    const listened = change(newDoc, () => {
      /* DEBUG */ this.col_('Document %s was modified', newDoc.id)
      newDoc.data._updatedAt = Date.now()
      if (Object.keys(newDoc.indexed).length > 0) {
        for (const key in newDoc.indexed) {
          updateDocIndex(newDoc, key)
          this.col_('Updated index "%s" for document %s', key, newDoc.id)
        }
      }
      for (const key of this.reactiveIndexed.keys()) {
        updateReactiveIndex(this, key)
        this.col_('Updated collection reactive index for key %j', key)
      }
      /* DEBUG */ this.col_('Emitting event "EventCollectionDocumentUpdated"')
      this.db.emitEvent({
        event: 'EventCollectionDocumentUpdated',
        doc: newDoc,
      })
    })

    this.docs.push(listened)

    for (const key of this.reactiveIndexed.keys()) {
      /* DEBUG */ this.col_('Updating index')
      if (opts.reactiveUpdate) updateReactiveIndex(this, key)
    }

    /* DEBUG */ this.col_('Emitting event "EventCollectionInsertComplete"')
    this.db.emitEvent({
      event: 'EventCollectionInsertComplete',
      doc: newDoc,
    })

    /* DEBUG */ this.col_('Document: %s, pushed to collection', newDoc.id)
    return newDoc
  }

  /**
   * Alias of insertOne
   * @param opts Insert document options
   */
  insert(opts: CollectionInsertOpts) {
    return this.insertOne(opts)
  }

  /**
   * Add any amount of new documents to the collection
   * @param docs New documents to be added
   */
  insertMany(opts: CollectionInsertManyOpts) {
    /* DEBUG */ this.col_('Creating %d new documents', opts.doc.length)
    opts.doc.map((doc, i, arr) =>
      this.insertOne({
        doc,
        reactiveUpdate: i === arr.length - 1 && opts.reactiveUpdate,
      })
    )
    return this
  }

  /**
   * Custom handler for toString to avoid recursion of toString and toJSON
   */
  toString() {
    return `(DBCollection<${this.name}>)`
  }

  /**
   * Custom handler for toJSON to avoid recursion of toString and toJSON
   */
  toJSON() {
    const str = this.toString()

    /* DEBUG */ this.col_('Emitting event "EventCollectionToJSON"')
    const event: MemsDBEvent = {
      event: 'EventCollectionToJSON',
      str,
    }
    this.db.emitEvent(event)

    return event.str
  }
}
