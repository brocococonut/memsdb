import { runQuery } from "./query";
import { DBDoc } from "../doc";
import { Query } from "../types";
import { DBCollection } from "../collection";

/**
 * Set a reactive query on a collection (should be run from the collection, not directly)
 * @param collection Collection to update reactive index on
 * @param query Queries to run
 */
export const updateReactiveIndex = (collection: DBCollection, query: Query[]) =>
  collection.reactiveIndexed.set(
    query,
    runQuery(query, collection, collection.docs)
  );

/**
 * Create a new reactive index from a query array (should be run from the collection, not directly)
 * @param collection Collection to create reactive index on
 * @param query Query array to perform
 */
export const createReactiveIndex = (
  collection: DBCollection,
  query: Query[]
) => {
  if (!collection.reactiveIndexed.has(query))
    updateReactiveIndex(collection, query);

  return collection.reactiveIndexed.get(query) as DBDoc[];
};
