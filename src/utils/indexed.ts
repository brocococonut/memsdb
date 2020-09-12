import { nestedKey } from "./key";
import { DBDoc } from "../doc";
import { Query } from "../types";

/**
 * Update an index on a document to increase search speeds for nested keys and arrays
 * @param doc Document to update index on
 * @param key Query key to update index on
 */
export const updateDocIndex = (doc: DBDoc, key = "") => {
  if (doc.collection.db.options.useDynamicIndexes) {
    doc.indexed[key] = nestedKey(doc.data, key);

    return doc.indexed[key];
  } else return nestedKey(doc.data, key);
};

/**
 * Get/Create an index on the document and/or collection (if reactive) based
 * on the provided query
 * @param param0 Index options
 */
export const getOrCreateIndex = ({
  doc,
  query,
}: {
  doc: DBDoc;
  query: Query;
}) => {
  let res: any | any[];
  const { key, reactiveQuery } = query;
  if (doc.collection.db.options.useDynamicIndexes || reactiveQuery) {
    if (key.includes("[]")) {
      if (doc.indexed[key]) res = doc.indexed[key];
      else res = updateDocIndex(doc, key);
    } else res = nestedKey(doc.data, key);
  } else res = nestedKey(doc.data, key);

  return res;
};
