import { ObjectId } from 'bson'
import debug from 'debug'

const memsdb_ = debug('memsdb')

/** Base template of a schema/collection */
interface SchemaTemplateType {
  /** Name of the collection schema */
  name: string
  /**
   * Structure of the collection. A key's value will be treated as
   * the default value for that key
   */
  structure: { [key: string]: any }
}

/** Query interface */
interface Query {
  /** Key to run the query on */
  key: string
  /** Inverse result requirement */
  inverse?: boolean
  /** Operation to perform */
  operation: '<' | '>' | '<=' | '>=' | '===' | '||'
  /** Value to compare against */
  comparison: any | Query[]
}

/** Population specific query */
interface PopulateQuery {
  /* Where on the source doc to compare to */
  srcField: string
  /* Where on the comparison doc to compare to */
  targetField: string
  /* Where to place the child documents matching this query */
  destinationField: string
  /* The collection to pull child documents from for this query */
  collection: DBCollection
}

/**
 * Run a query to filter out specific documents
 * @param queryArr Array of query objects to run/loop through
 * @param col Collection to run query on
 * @param docs Document array to filter, either from the collection, or from recursion
 */
const runQuery = (
  queryArr: Query[],
  col: DBCollection,
  docs: DBDoc[],
): DBDoc[] => {
  // Debugger variable
  const _ = col.col_.extend('query')

  /* DEBUG */ _(
    'Querying collection `%s`. %d queries left to execute',
    col.name,
    queryArr.length,
  )
  // Run the first query of the array
  const query = queryArr.shift()

  // Check to see if the collection schema has the provided key
  if (query && col.schema.hasOwnProperty(query.key)) {
    /* DEBUG */ _(
      'Collection contains key `%s`, querying key with operator `%s`',
      query.key,
      query.operation,
    )
    // Run the specified query
    switch (query.operation) {
      case '<':
        // Filter out documents where the target is less than the provided value
        docs = docs.filter(({ id, data: doc }) => {
          const res = doc[query.key] < query.comparison

          return query.inverse ? !res : res
        })
        break
      case '>':
        // Filter out documents where the target is greater than the provided value
        docs = docs.filter(({ id, data: doc }) => {
          const res = doc[query.key] > query.comparison

          return query.inverse ? !res : res
        })
        break
      case '<=':
        // Filter out documents where the target is less than or equal to the the provided value
        docs = docs.filter(({ id, data: doc }) => {
          const res = doc[query.key] <= query.comparison

          return query.inverse ? !res : res
        })
        break
      case '>=':
        // Filter out documents where the target is greater than or equal tothe provided value
        docs = docs.filter(({ id, data: doc }) => {
          const res = doc[query.key] >= query.comparison

          return query.inverse ? !res : res
        })
        break
      case '===':
        // Filter out documents where the target is equal to the provided value
        docs = docs.filter(({ id, data: doc }) => {
          const res = doc[query.key] === query.comparison

          return query.inverse ? !res : res
        })
        break

      case '||':
        // Run multiple queries and combine the results of all of them

        // Create a temporary array for the documents for filtering later on
        let tmp: DBDoc[] = []

        // Map over the comparison array of queries and run them
        query.comparison.map((orQuery: Query) =>
          tmp.push(
            // Push all the results to the temp array
            ...runQuery(
              [
                {
                  ...orQuery,
                  inverse: query.inverse ? !orQuery.inverse : orQuery.inverse,
                },
              ],
              col,
              docs,
            ),
          ),
        )

        // Get an array of all the document IDs for filtering
        const idArr = tmp.map((doc) => doc.id)

        // Filter out documents that exist multiple times in the array.
        docs = tmp.filter((doc, i) => i === idArr.indexOf(doc.id))
        break
    }
  }

  // Return filtered documents if there are none left, or if the query array is empty
  if (docs.length === 0 || queryArr.length === 0) {
    /* DEBUG */ _(
      'Query on collection `%s` completed, %d documents left with %d queries left to execute',
      col.name,
      docs.length,
      queryArr.length,
    )
    return docs
  }
  // Otherwise follow the queries down the rabbit hole
  else {
    /* DEBUG */ _(
      'Query on collection `%s` recursing with %d documents left and %d queries left to execute',
      col.name,
      docs.length,
      queryArr.length,
    )
    return runQuery(queryArr, col, docs)
  }
}

/**
 * Class for creating structured documents
 */
export class DBDoc {
  /** Reference to the parent collection */
  collection: DBCollection
  /** Document id */
  id: string
  /** Value of the document */
  data: { _createAt?: Date; [key: string]: any } = {}
  /** Debugger variable */
  doc_: debug.Debugger

  /**
   * Construct a new Document with the collections schema and any provided data
   * @param data Data to be assigned to the document schema
   * @param collection Reference to the parent collection
   */
  constructor(data: { [key: string]: any }, collection: DBCollection) {
    this.collection = collection

    // Ensure the document has a valid and unique ID
    this.id = new ObjectId().toHexString()

    // Ensure this.data is a replica of the schema before assigning the new data
    Object.assign(this.data, this.collection.schema)

    this.data._createdAt = new Date()

    // Assign the data to the new document
    Object.assign(this.data, data)

    this.doc_ = collection.col_.extend(this.id)
  }

  /**
   * Delete this document from the db
   */
  delete() {
    try {
      /* DEBUG */ this.doc_('Deleting this document')
      this.collection.docs.splice(
        this.collection.docs.findIndex((val) => val === this),
        1,
      )
    } catch (err) {
      /* DEBUG */ this.doc_('Failed to delete this document, %O', err)
    }
  }

  /**
   * Set properties of document data model to the current document
   * @param doc document/object to assign to the current data model
   */
  set(doc: { [key: string]: any }) {
    /* DEBUG */ this.doc_('Updating document with provided key:values')
    Object.assign(this.data, doc)

    return this
  }

  /**
   * Populate the document with another document that matches the query.
   * This will return a copy of the document and not a reference to the original
   * @param opts Options for the populate. Things like the target field and query don't have to set
   */
  populate(opts: {
    srcField: string
    targetField?: string
    targetCol: DBCollection
    query?: Query[]
    destinationField?: string
    unwind?: boolean
  }) {
    // Debugger variable
    const populate_ = this.doc_.extend('populate')
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
        },
      ],
      destinationField = 'children',
      unwind = false,
    } = opts

    /* DEBUG */ populate_(
      'Populating document `%s` field with results from `%s.%s`',
      destinationField,
      targetCol,
      targetField,
    )

    // Construct a new document based on the original so as to not perform a mutation
    /* DEBUG */ populate_(
      'Creating identical document so as to avoid mutations',
    )
    const resultDoc = new DBDoc(this.data, this.collection)
    resultDoc.id = this.id

    /* DEBUG */ populate_('Finding child documents')
    const queriedDocuments = targetCol.find(query)

    // Set a specific field to the results of the query, unwinding if necessary
    /* DEBUG */ populate_(
      'Setting field on document to contain children. Unwind: %s',
      unwind ? 'true' : 'false',
    )
    resultDoc.data[destinationField] =
      unwind && queriedDocuments.length < 2
        ? queriedDocuments[0]
        : queriedDocuments

    // Return the copied document and not the original
    /* DEBUG */ populate_('Finished populating field, returning ghost document')
    return resultDoc
  }

  tree(populations: PopulateQuery[] = [], maxDepth = 0, currentDepth = 1) {
    // Debugger variable
    const tree_ = this.doc_.extend('tree')

    const doc = new DBDoc(this.data, this.collection)
    /* DEBUG */ tree_('Number of populations: %d', populations.length)

    // Map over populations array to run individual populations
    populations.map((q, i) => {
      if (this.collection.name === q.collection.name) {
        /* DEBUG */ tree_('Running population number %d', i)

        const children = q.collection.find([
          {
            comparison: q.srcField === 'id' ? this.id : this.data[q.srcField],
            key: q.targetField,
            operation: '===',
          },
        ])

        if (maxDepth && currentDepth <= maxDepth)
          doc.data[q.destinationField] = children.map((child) =>
            child.tree(populations, maxDepth, currentDepth + 1),
          )
      }
    })

    /* DEBUG */ tree_(
      'Finished running %d populations, returning result',
      populations.length,
    )
    return doc
  }

  /**
   * Returns a simplified view
   */
  toJSON() {
    return {
      ...this.data,
      id: this.id,
      _type: `(DBCollection<${this.collection.name}<DBDoc>>)`,
    }
  }
}

/**
 * Class for creating collections of structured documents
 */
export class DBCollection {
  /** Name of the collection */
  name: string
  /** Schema every document should adhere to */
  schema: { [key: string]: any }
  /** Document array */
  docs: DBDoc[]
  /** Debugger variable */
  col_: debug.Debugger

  constructor(db: DB, schema: SchemaTemplateType) {
    this.schema = schema.structure
    this.docs = []
    this.name = schema.name

    this.col_ = db.db_.extend(schema.name)
    db.addCollection(this, true)
  }

  /**
   * Find a specific document by its id
   * @param idStr ID to filter by
   */
  id(idStr: string) {
    /* DEBUG */ this.col_('Finding document by id `%s`', idStr)
    const doc = this.docs.find((val) => val.id === idStr)
    /* DEBUG */ this.col_(
      'Document found for id:`%s` %s',
      idStr,
      doc ? 'true' : 'false',
    )
    return doc
  }

  /**
   * Run a set of queries to filter documents
   * @param queries Array of queries to run
   */
  find(queries?: Query[]) {
    /* DEBUG */ this.col_('Starting find query')
    let docs
    if (!queries) {
      /* DEBUG */ this.col_('No query specified, using empty array')
      docs = runQuery([], this, this.docs)
    } else docs = runQuery(queries, this, this.docs)
    /* DEBUG */ this.col_('Documents found for query: %d', docs.length)
    return docs
  }

  /**
   * Insert a new document into the array. Defaults will be loaded from the schema
   * @param doc Document to insert
   */
  insertOne(doc: { [key: string]: any }) {
    /* DEBUG */ this.col_('Creating new document')
    const newDoc = new DBDoc(doc, this)
    /* DEBUG */ this.col_(
      'Created document with id: %s, pushing to collection',
      newDoc.id,
    )
    this.docs.push(newDoc)
    /* DEBUG */ this.col_('Document: %s, pushed to collection', newDoc.id)
    return newDoc
  }

  /**
   * Alias of insertOne
   * @param doc Document to insert
   */
  insert(doc: { [key: string]: any }) {
    return this.insertOne(doc)
  }

  /**
   * Add any amount of new documents to the collection
   * @param docs New documents to be added
   */
  insertMany(...docs: { [key: string]: any }[]) {
    /* DEBUG */ this.col_('Creating %d new documents', docs.length)
    docs.map((doc) => this.insertOne(doc))
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
    return this.toString()
  }
}

/**
 * Database constructor containing all the initialised collections
 */
export class DB {
  /** Key based object containing all the collections */
  collections: { [key: string]: DBCollection } = {}
  /** Debugger variable */
  db_: debug.Debugger

  /**
   * Construct a new in memory db with the provided collection references
   * @param collections Collections to initialise with
   */
  constructor(name: string = new ObjectId().toHexString()) {
    this.db_ = memsdb_.extend(name)
  }

  /**
   * Return a specified collection by name
   * @param name Collection name to select
   */
  c(name: string) {
    /* DEBUG */ this.db_(
      'Finding and returning collection with name/key of `%s`',
      name,
    )
    return this.collections[name]
  }

  /**
   * Alias of this.c() - Returns a specified collection
   * @param name Name of collection to retrieve
   */
  collection(name: string) {
    return this.c(name)
  }

  /**
   * Add a new collection to the DB. It won't replace a collection unless you specify to
   * @param collection Collection to add to the db
   * @param replace Replace the specified collection if it exists
   */
  addCollection(collection: DBCollection, replace: boolean = false) {
    /* DEBUG */ this.db_(
      'Adding collection `%s` to DB. Replace if it already exists:',
      collection.name,
      replace ? 'true' : 'false',
    )
    if (!this.collections[collection.name] || replace)
      this.collections[collection.name] = collection

    return collection
  }

  /**
   *
   * @param name Collection name to delete
   */
  deleteCollection(name: string) {
    try {
      /* DEBUG */ this.db_('Removing collection `%s` from DB', name)
      delete this.collections[name]
    } catch (err) {
      /* DEBUG */ this.db_(
        "Collection deletion failed successfully, collection `%s` doesn't exist",
        name,
      )
    } finally {
      return this
    }
  }

  /**
   *
   * @param name Empty out a specified collection
   */
  emptyCollection(name: string) {
    try {
      /* DEBUG */ this.db_(
        'Emptying collection `%s`. Current document count: %d',
        name,
        this.collections[name].docs.length,
      )
      this.collections[name].docs.length = 0
      /* DEBUG */ this.db_(
        'Emptying collection `%s` completed. Current document count: %d',
        name,
        this.collections[name].docs.length,
      )
    } catch (err) {
      /* DEBUG */ this.db_(
        'Emptying collection `%s` failed as it does not exist.',
        name,
      )
    } finally {
      return this
    }
  }
}
