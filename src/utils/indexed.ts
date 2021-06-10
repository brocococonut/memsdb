import { nestedKey } from './key'

import type { DBDoc } from '../doc'
import type { Query } from '../types/query'

/**
 * Update an index on a document to increase search speeds for nested keys and arrays
 * @param doc Document to update index on
 * @param key Query key to update index on
 * @ignore
 */
export const updateDocIndex = (doc: DBDoc, key = '') => {
  if (doc.collection.db.options.useDynamicIndexes) {
    doc.indexed[key] = nestedKey(doc.data, key)

    return doc.indexed[key]
  } else return nestedKey(doc.data, key)
}

/**
 * Get/Create an index on the document and/or collection (if reactive) based
 * on the provided query
 * @param param0 Index options
 * @ignore
 */
export const getOrCreateIndex = ({
  doc,
  query,
}: {
  doc: DBDoc
  query: Query
}): any | any[] => {
  const { key, reactiveQuery } = query

  // Ensure a reactive index is actually needed
  if (doc.collection.db.options.useDynamicIndexes || reactiveQuery) {
    // Handle whether the key includes an array
    if (key.includes('[]')) {
      // If the key exists in the index list, return that array instead of
      // getting the original which may be however many levels down
      if (doc.indexed[key]) return doc.indexed[key]
      // If it doesn't exist, use the updateDocIndex function to create it and
      // return the results
      else return updateDocIndex(doc, key)
    }
    // If not, just return the normal key
    else return nestedKey(doc.data, key)
  }
  // Otherwise just return the nested key
  else return nestedKey(doc.data, key)
}
