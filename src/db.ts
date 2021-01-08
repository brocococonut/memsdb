import { v4 } from "uuid";
import debug from "debug";
import { DBCollection } from "./collection";
import { VoidBackup } from "./backupProviders/void";
import { Backup, BackupProvider } from "./backupProviders";

const memsdb_ = debug("memsdb");

/**
 * Database constructor containing all the initialised collections
 */
export class DB {
  /** Key based object containing all the collections */
  readonly name: string = "memsdb";
  collections: { [key: string]: DBCollection } = {};
  /** Debugger variable */
  readonly db_: debug.Debugger;
  options: {
    useDynamicIndexes: boolean
    backupProvider: BackupProvider
  } = {
    useDynamicIndexes: true,
    backupProvider: new VoidBackup()
  };

  /**
   * Construct a new in memory db with the provided collection references
   * @param name Name of database
   * @param opts Options object to modify DB behaviour (mostly unused)
   */
  constructor(
    name: string = v4(),
    opts: {
      /**
       * Automatically generate dynamic indexes - link deeply nested content
       * in a document to the root document to speed up future query results
       */
      useDynamicIndexes?: boolean;
      /**
       * BackupProvider to save and restore documents/collections to and from
       */
      backupProvider?: BackupProvider,
    } = {}
  ) {
    this.name = name;
    this.db_ = memsdb_.extend(`<db>${name}`);
    if (opts.useDynamicIndexes)
      this.options.useDynamicIndexes = opts.useDynamicIndexes;
    
    if (opts.backupProvider) this.options.backupProvider = opts.backupProvider
  }

  /**
   * Return a specified collection by name
   * @param name Collection name to select
   */
  c(name: string) {
    /* DEBUG */ this.db_(
      "Finding and returning collection with name/key of `%s`",
      name
    );
    return this.collections[name];
  }

  /**
   * Alias of this.c() - Returns a specified collection
   * @param name Name of collection to retrieve
   */
  collection(name: string) {
    return this.c(name);
  }

  /**
   * Add a new collection to the DB. It won't replace a collection unless you specify to
   * @param collection Collection to add to the db
   * @param replace Replace the specified collection if it exists
   */
  addCollection(collection: DBCollection, replace: boolean = false) {
    /* DEBUG */ this.db_(
      "Adding collection `%s` to DB. Replace if it already exists:",
      collection.name,
      replace ? "true" : "false"
    );
    if (!this.collections[collection.name] || replace)
      this.collections[collection.name] = collection;

    return collection;
  }

  /**
   *
   * @param name Collection name to delete
   */
  deleteCollection(name: string) {
    try {
      /* DEBUG */ this.db_("Removing collection `%s` from DB", name);
      delete this.collections[name];
    } catch (err) {
      /* DEBUG */ this.db_(
        "Collection deletion failed successfully, collection `%s` doesn't exist",
        name
      );
    } finally {
      return this;
    }
  }

  /**
   *
   * @param name Empty out a specified collection
   */
  emptyCollection(name: string) {
    try {
      /* DEBUG */ this.db_(
        "Emptying collection `%s`. Current document count: %d",
        name,
        this.collections[name].docs.length
      );
      this.collections[name].docs.length = 0;
      /* DEBUG */ this.db_(
        "Emptying collection `%s` completed. Current document count: %d",
        name,
        this.collections[name].docs.length
      );
    } catch (err) {
      /* DEBUG */ this.db_(
        "Emptying collection `%s` failed as it does not exist.",
        name
      );
    } finally {
      return this;
    }
  }

  /**
   * Backup collection data to the provided BackupProvider.
   */
  backup() {
    /* DEBUG */ this.db_("Backing up database to BackupProvider");
    const backup: Backup = {}

    const collections = Object.keys(this.collections)

    collections.forEach(col => {
      const collection = this.collections[col]

      const keys = Object.keys(collection.schema)
      const values = collection.docs.map(doc => [doc.id, ...keys.map(key => doc.data[key])])

      keys.unshift('id')

      backup[col] = {
        keys,
        values
      }
    })

    /* DEBUG */ this.db_("Data structure created for backup");

    const backedUp = this.options.backupProvider.save(backup)

    /* DEBUG */ this.db_("Backup finished, result: %s", backedUp ? 'Data backed up' : 'Data NOT backed up');
  }

  /**
   * Restore collection documents from a backup using the provided
   * BackupProvider. This won't overwrite any documents
   */
  restore() {
    /* DEBUG */ this.db_("Restoring database collections from BackupProvider");
    const backup = this.options.backupProvider.load()

    /* DEBUG */ this.db_("Collection data loaded from BackupProvider");

    const collectionKeys = Object.keys(backup)

    /* DEBUG */ this.db_("%d collections to restore", collectionKeys.length);

    collectionKeys.forEach(colKey => {
      const col = this.collections[colKey]
      if (!col) return;

      const data = backup[colKey]

      data.values.forEach((docData) => {
        const doc: {[key: string]: any} = {}

        data.keys.forEach((key, i) => {
          // Skip the ID
          if (i === 0) return;
          doc[key] = docData[i]
        })

        col.insertOne(doc, docData[0])
      })
    })

    /* DEBUG */ this.db_("Database restored");
  }
}
