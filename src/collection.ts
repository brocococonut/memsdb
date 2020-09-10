import { DBDoc } from "./doc";
import { DB } from "./db";
import { Query, SchemaTemplateType } from "./types";
import { runQuery } from "./utils/query";
import { updateReactiveIndex, createReactiveIndex } from "./utils/reactive";
import change from 'on-change'
import { updateDocIndex } from "./utils/indexed";

/**
 * Class for creating collections of structured documents
 */
export class DBCollection {
  /** Name of the collection */
  name: string;
  /** Schema every document should adhere to */
  schema: { [key: string]: any };
  /** Document array */
  docs: DBDoc[];
  /** Debugger variable */
  col_: debug.Debugger;
  /** Reference to the DB object */
  db: DB;
  /** Map for reactive query results */
  reactiveIndexed: Map<Query[], {docs: DBDoc[]}> = new Map();

  /**
   * Create a structured collection of documents
   * @param db Database reference
   * @param schema Schema for content to adhere to
   */
  constructor(db: DB, schema: SchemaTemplateType) {
    this.schema = schema.structure;
    this.docs = [];
    this.name = schema.name;

    this.col_ = db.db_.extend(schema.name);
    db.addCollection(this, true);

    this.db = db;
  }

  /**
   * Find a specific document by its id
   * @param idStr ID to filter by
   */
  id(idStr: string) {
    /* DEBUG */ this.col_("Finding document by id `%s`", idStr);
    const doc = this.docs.find((val) => val.id === idStr);
    /* DEBUG */ this.col_(
      "Document found for id:`%s` %s",
      idStr,
      doc ? "true" : "false"
    );
    return doc;
  }

  /**
   * Run a set of queries to filter documents
   * @param queries Array of queries to run
   * @param reactive Create and keep a reactive index of the query on the collection under collection.reactive[queryArr]
   */
  find(queries?: Query[], reactive?: boolean) {
    /* DEBUG */ this.col_("Starting find query");
    let docs: DBDoc[] = [];
    if (!queries) {
      /* DEBUG */ this.col_("No query specified, using empty array");
      docs = runQuery([], this, this.docs);
    } else if (reactive) {
      createReactiveIndex(this, queries);
      docs = runQuery(queries, this, this.docs);
    }
    else {
      docs = runQuery(queries, this, this.docs);
    }

    /* DEBUG */ this.col_("Documents found for query: %d", docs.length);
    return docs;
  }

  /**
   * Insert a new document into the array. Defaults will be loaded from the schema
   * @param doc Document to insert
   */
  insertOne(doc: { [key: string]: any }, id?: string, reactiveUpdate = true) {
    /* DEBUG */ this.col_("Creating new document");
    const newDoc = new DBDoc(doc, this);
    /* DEBUG */ this.col_(
      "Created document with id: %s, pushing to collection",
      newDoc.id
    );

    if (id) newDoc.id = id;

    const listened = change(newDoc, () => {
      this.col_('Document %s was modified', newDoc.id)
      if (Object.keys(newDoc.indexed).length > 0) {
        for (const key in newDoc.indexed) {
          updateDocIndex(newDoc, key);
          this.col_('Updated index "%s" for document %s', key, newDoc.id)
        }
      }
      for (const key of this.reactiveIndexed.keys()) {
        updateReactiveIndex(this, key);
        this.col_('Updated collection reactive index for key %j', key)
      }
    })

    this.docs.push(listened);

    for (const key of this.reactiveIndexed.keys()) {
      /* DEBUG */ this.col_("Updating index");
      if (reactiveUpdate) updateReactiveIndex(this, key);
    }

    /* DEBUG */ this.col_("Document: %s, pushed to collection", newDoc.id);
    return newDoc;
  }

  /**
   * Alias of insertOne
   * @param doc Document to insert
   */
  insert(doc: { [key: string]: any }) {
    return this.insertOne(doc);
  }

  /**
   * Add any amount of new documents to the collection
   * @param docs New documents to be added
   */
  insertMany(...docs: { [key: string]: any }[]) {
    /* DEBUG */ this.col_("Creating %d new documents", docs.length);
    docs.map((doc, i, arr) => this.insertOne(doc, undefined, i === arr.length - 1));
    return this;
  }

  /**
   * Custom handler for toString to avoid recursion of toString and toJSON
   */
  toString() {
    return `(DBCollection<${this.name}>)`;
  }

  /**
   * Custom handler for toJSON to avoid recursion of toString and toJSON
   */
  toJSON() {
    return this.toString();
  }
}
