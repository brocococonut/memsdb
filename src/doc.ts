import { v4 } from 'uuid'
import change from 'on-change'
import { cloneDeep, merge } from 'smoldash'
import { nestedKey } from './utils/key'
import { updateReactiveIndex } from './utils/reactive'

import type { DBCollection } from './collection'
import type { DocumentCustomPopulateOpts, DocumentTreeOpts } from './types/Document'
import type { MemsDBEvent } from './types/events'
import { populate } from './utils/populate'

/**
 * Class for creating structured documents
 */
export class DBDoc {
  /** Document id */
  id: string
  /** Value of the document */
  data: {
    [key: string]: any
  } = {}

  _createdAt: number = Date.now()
  _updatedAt: number = Date.now()

  /** Debugger variable */
  readonly doc_: debug.Debugger
  /** Reference to the parent collection */
  readonly collection: DBCollection

  /** Reference to indexed data for repeated deep data matching */
  indexed: {
    [key: string]: any | any[]
  } = {}

  /** Object for any plugin related data */
  pluginData: { [key: string]: any } = {}

  /**
   * @ignore
   * A reference to the on-change listened document
   */
  private _listenedRef: DBDoc = this

  /**
   * Construct a new Document with the collections schema and any provided data
   * @param data Data to be assigned to the document schema
   * @param collection Reference to the parent collection
   */
  constructor(
    data: { [key: string]: any },
    collection: DBCollection,
    id = v4()
  ) {
    this.collection = collection

    // Ensure the document has a valid and unique ID
    this.id = id

    // Ensure this.data is a replica of the schema before assigning the new data
    this.data = merge(cloneDeep(this.collection.schema), cloneDeep(data))

    // Assign the data to the new document
    this.doc_ = collection.col_.extend(`<doc>${this.id}`)
  }

  /**
   * Delete this document from the db
   */
  delete() {
    try {
      /* DEBUG */ this.doc_('Emitting event "EventDocumentDelete"')
      this.emitEvent({
        event: 'EventDocumentDelete',
        doc: this,
      })

      /* DEBUG */ this.doc_('Splicing document from collection')
      this.collection.docs.splice(
        this.collection.docs.findIndex((val) => val === this),
        1
      )

      for (const key of this.collection.reactiveIndexed.keys()) {
        /* DEBUG */ this.doc_('Updating reactive index')
        updateReactiveIndex(this.collection, key)
      }

      /* DEBUG */ this.doc_('Removing nested change listener')
      change.unsubscribe(this._listenedRef)

      /* DEBUG */ this.doc_('Emitting event "EventDocumentDeleteComplete"')
      this.emitEvent({
        event: 'EventDocumentDeleteComplete',
        id: this.id,
        success: true,
      })
    } catch (err) {
      /* DEBUG */ this.doc_('Failed to delete this document, %J', err)
      /* DEBUG */ this.doc_(
        'Emitting event "EventDocumentDeleteComplete" with error'
      )
      this.emitEvent({
        event: 'EventDocumentDeleteComplete',
        id: this.id,
        success: false,
        error: err as Error,
      })
    }
  }

  /**
   * Populate down a tree of documents based on the provided MemsPL populateQuery
   * @param populateQuery MemsPL population query
   * @param filter Filter unspecified keys from the populated documents
   * @returns Cloned version of this document
   */
  populate(
    populateQuery: string,
    filter = false
  ) {
    const [populated] = populate(this.collection, [this], populateQuery, filter)

    return populated
  }

  /**
   * Populate the document with another document that matches the query.
   * This will return a copy of the document and not a reference to the original
   * @param opts Options for the populate. Things like the target field and query don't have to be set
   */
  customPopulate(opts: DocumentCustomPopulateOpts) {
    // Debugger variable
    const populate_ = this.doc_.extend('customPopulate')

    // Construct a new document based on the original so as to not perform a mutation
    /* DEBUG */ populate_(
      'Creating identical document so as to avoid mutations'
    )
    const resultDoc = this.clone()

    /* DEBUG */ this.doc_('Emitting event "EventDocumentCustomPopulate"')
    this.emitEvent({
      event: 'EventDocumentCustomPopulate',
      doc: resultDoc,
      opts,
    })

    // Destructure out variables
    const {
      srcField,
      targetField = 'id',
      targetCol,
      query = [
        {
          key: targetField,
          operation: '===',
          comparison: srcField === 'id' ? this.id : this.data[srcField],
          inverse: false,
        },
      ],
      destinationField = 'children',
      unwind = false,
    } = opts

    /* DEBUG */ populate_(
      'Populating document `%s` field with results from `%s.%s`',
      destinationField,
      targetCol,
      targetField
    )

    /* DEBUG */ populate_('Finding child documents')
    const queriedDocuments = targetCol.find({ queries: query })

    // Set a specific field to the results of the query, unwinding if necessary
    /* DEBUG */ populate_(
      'Setting field on document to contain children. Unwind: %s',
      unwind ? 'true' : 'false'
    )
    resultDoc.data[destinationField] =
      unwind && queriedDocuments.length < 2
        ? queriedDocuments[0]
        : queriedDocuments

    /* DEBUG */ this.doc_(
      'Emitting event "EventDocumentCustomPopulateComplete"'
    )
    this.emitEvent({
      event: 'EventDocumentCustomPopulateComplete',
      doc: resultDoc,
      opts,
    })

    // Return the copied document and not the original
    /* DEBUG */ populate_('Finished populating field, returning ghost document')
    return resultDoc
  }

  /**
   * Populate a tree of documents. It's recommended you use the provided
   * populate (import {populate} from 'memsdb';) function instead.
   * @param opts Options for making a tree from the provided document
   * @returns A cloned version of this doc that has the data field formatted into a tree
   */
  tree(opts: DocumentTreeOpts = {}) {
    opts = {
      populations: [],
      maxDepth: 0,
      currentDepth: 1,
      ...opts,
    }
    // Debugger variable
    const tree_ = this.doc_.extend('tree')

    const doc = this.clone()

    /* DEBUG */ this.doc_('Emitting event "EventDocumentTree"')
    this.emitEvent({
      event: 'EventDocumentTree',
      doc,
      opts,
    })

    if (!opts) return doc

    /* DEBUG */ tree_('Number of populations: %d', opts.populations?.length)

    // Map over populations array to run individual populations
    opts.populations?.map((q, i) => {
      if (this.collection.name === q.collection.name) {
        /* DEBUG */ tree_('Running population number %d', i)

        const children = q.collection.find({
          queries: [
            {
              key: q.targetField,
              operation: '===',
              comparison:
                q.srcField === 'id'
                  ? this.id
                  : nestedKey(this.data, q.srcField),
              inverse: false,
            },
          ],
        })

        if (opts.maxDepth && <number>opts.currentDepth <= opts.maxDepth)
          doc.data[q.destinationField] = children.map((child: DBDoc) =>
            child.tree({ ...opts, currentDepth: <number>opts.currentDepth + 1 })
          )
      }
    })

    /* DEBUG */ this.doc_('Emitting event "EventDocumentTreeComplete"')
    this.emitEvent({
      event: 'EventDocumentTreeComplete',
      doc,
      opts,
    })

    /* DEBUG */ tree_(
      'Finished running %d populations, returning result',
      opts.populations?.length
    )
    return doc
  }

  /**
   * Duplicate this document, making mutations to it not affect the original
   */
  clone() {
    /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"')
    this.emitEvent({
      event: 'EventDocumentClone',
      doc: this,
    })
    const cloned = new DBDoc({}, this.collection, this.id)
    
    cloned.data = cloneDeep(this.data)

    cloned.data._createdAt = this.data._createdAt
    cloned.data._updatedAt = this.data._updatedAt

    /* DEBUG */ this.doc_('Emitting event "EventDocumentClone"')
    this.emitEvent({
      event: 'EventDocumentCloneComplete',
      doc: cloned,
    })

    return cloned
  }

  /**
   * Emit an event to the attached database
   * @param event Event to emit
   */
  emitEvent(event: MemsDBEvent) {
    this.collection.emitEvent(event)
  }

  /**
   * Returns a simplified view
   */
  toJSON() {
    return {
      ...this.data,
      id: this.id,
      _type: `(DBCollection<${this.collection.name}<DBDoc>>)`,
      _indexes: Object.keys(this.indexed),
    }
  }
}
