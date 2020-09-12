import { v4 } from "uuid";
import change from 'on-change'
import { DBCollection } from "./collection";
import { Query, PopulateQuery } from "./types";
import { nestedKey } from "./utils/key";
import { updateReactiveIndex } from "./utils/reactive";
import { QueryBuilder } from "./utils/query";

/**
 * Class for creating structured documents
 */
export class DBDoc {
  /** Reference to the parent collection */
  readonly collection: DBCollection;
  /** Document id */
  id: string;
  /** Value of the document */
  data: {
    _createdAt?: number;
    _updatedAt?: number;
    [key: string]: any;
  } = {};
  /** Debugger variable */
  readonly doc_: debug.Debugger;

  indexed: {
    [key: string]: any | any[];
  } = {};

  private _listenedRef: DBDoc = this

  /**
   * Construct a new Document with the collections schema and any provided data
   * @param data Data to be assigned to the document schema
   * @param collection Reference to the parent collection
   */
  constructor(data: { [key: string]: any }, collection: DBCollection) {
    this.collection = collection;

    // Ensure the document has a valid and unique ID
    this.id = v4();

    // Ensure this.data is a replica of the schema before assigning the new data
    Object.assign(this.data, this.collection.schema);

    // Assign the data to the new document
    Object.assign(this.data, data);

    this.data._createdAt = Date.now();
    this.data._updatedAt = Date.now();

    this.doc_ = collection.col_.extend(`<doc>${this.id}`);
  }

  /**
   * Delete this document from the db
   */
  delete() {
    try {
      /* DEBUG */ this.doc_("Splicing document from collection");
      this.collection.docs.splice(
        this.collection.docs.findIndex((val) => val === this),
        1
      );

      for (const key of this.collection.reactiveIndexed.keys()) {
        /* DEBUG */ this.doc_("Updating reactive index");
        updateReactiveIndex(this.collection, key);
      }

      /* DEBUG */ this.doc_("Removing nested change listener");
      change.unsubscribe(this._listenedRef)
    } catch (err) {
      /* DEBUG */ this.doc_("Failed to delete this document, %J", err);
    }
  }

  /**
   * Populate the document with another document that matches the query.
   * This will return a copy of the document and not a reference to the original
   * @param opts Options for the populate. Things like the target field and query don't have to set
   */
  populate(opts: {
    srcField: string;
    targetField?: string;
    targetCol: DBCollection;
    query?: Query[] | QueryBuilder;
    destinationField?: string;
    unwind?: boolean;
  }) {
    // Debugger variable
    const populate_ = this.doc_.extend("populate");
    // Destructure out variables
    const {
      srcField,
      targetField = "id",
      targetCol,
      query = [
        {
          key: targetField,
          operation: "===",
          comparison: srcField === "id" ? this.id : this.data[srcField],
        },
      ],
      destinationField = "children",
      unwind = false,
    } = opts;

    /* DEBUG */ populate_(
      "Populating document `%s` field with results from `%s.%s`",
      destinationField,
      targetCol,
      targetField
    );

    // Construct a new document based on the original so as to not perform a mutation
    /* DEBUG */ populate_(
      "Creating identical document so as to avoid mutations"
    );
    const resultDoc = new DBDoc(this.data, this.collection);
    resultDoc.id = this.id;

    /* DEBUG */ populate_("Finding child documents");
    const queriedDocuments = targetCol.find(query);

    // Set a specific field to the results of the query, unwinding if necessary
    /* DEBUG */ populate_(
      "Setting field on document to contain children. Unwind: %s",
      unwind ? "true" : "false"
    );
    resultDoc.data[destinationField] =
      unwind && queriedDocuments.length < 2
        ? queriedDocuments[0]
        : queriedDocuments;

    // Return the copied document and not the original
    /* DEBUG */ populate_(
      "Finished populating field, returning ghost document"
    );
    return resultDoc;
  }

  tree(populations: PopulateQuery[] = [], maxDepth = 0, currentDepth = 1) {
    // Debugger variable
    const tree_ = this.doc_.extend("tree");

    const doc = new DBDoc(this.data, this.collection);
    /* DEBUG */ tree_("Number of populations: %d", populations.length);

    // Map over populations array to run individual populations
    populations.map((q, i) => {
      if (this.collection.name === q.collection.name) {
        /* DEBUG */ tree_("Running population number %d", i);

        const children = q.collection.find([
          {
            key: q.targetField,
            operation: "===",
            comparison:
              q.srcField === "id" ? this.id : nestedKey(this.data, q.srcField),
          },
        ]);

        if (maxDepth && currentDepth <= maxDepth)
          doc.data[q.destinationField] = children.map((child: DBDoc) =>
            child.tree(populations, maxDepth, currentDepth + 1)
          );
      }
    });

    /* DEBUG */ tree_(
      "Finished running %d populations, returning result",
      populations.length
    );
    return doc;
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
    };
  }
}
