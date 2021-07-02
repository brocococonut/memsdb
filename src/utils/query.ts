import { nestedKey } from './key'
import { getOrCreateIndex } from './indexed'

import type { Query, Operators } from '../types/query'
import type { DBCollection } from '../collection'
import type { DBDoc } from '../doc'
import type{ Debugger } from 'debug'

/**
 * Compare a query to the provided document, ran by runQuery()
 * @ignore
 * @param doc Document to make comparison on
 * @param query Query to run
 * @category Query
 */
const compare = (doc: DBDoc, query: Query): boolean => {
  const val = getOrCreateIndex({ doc, query })
  const {
    operation: op,
    comparison: comp,
    inverse
  } = query
  let res = false

  if (
    (op === 'hasAllOf' ||
      op === 'all>than' ||
      op === 'all<than' ||
      op === 'all>=to' ||
      op === 'all<=to' ||
      op === 'all===to' ||
      op === 'some>than' ||
      op === 'some<than' ||
      op === 'some>=to' ||
      op === 'some<=to' ||
      op === 'some===to') &&
    !Array.isArray(val)
  )
    return false

  switch (op) {
    case '<':
      // Filter out documents where the target is less than the provided value
      res = getOrCreateIndex({ doc, query }) < comp

      break
    case '>':
      // Filter out documents where the target is greater than the provided value
      res = getOrCreateIndex({ doc, query }) > comp

      break
    case '<=':
      // Filter out documents where the target is less than or equal to the the provided value
      res = getOrCreateIndex({ doc, query }) <= comp

      break
    case '>=':
      // Filter out documents where the target is greater than or equal tothe provided value
      res = getOrCreateIndex({ doc, query }) >= comp

      break
    case '===':
      // Filter out documents where the target isn't equal to the provided value
      const data = getOrCreateIndex({ doc, query })
      res = data === comp

      break
    case 'includes':
      // Filter out documents that don't include the comparison
      if (Array.isArray(val)) res = val.includes(comp)
      else return false

      break
    case 'isContainedIn':
      if (!Array.isArray(comp)) break

      if (Array.isArray(val)) res = val.every((valT) => comp.includes(valT))
      else return (res = comp.includes(val))

      break
    case 'hasAllOf':
      // Filter out documents that don't have ALL of the comparison values
      if (!Array.isArray(comp)) return false

      res = comp.every((comparison) => val.includes(comparison))
      break
    case 'all>than':
      res = val.every((valT: any) => valT > comp)
      break
    case 'all<than':
      res = val.every((valT: any) => valT < comp)
      break
    case 'all>=to':
      res = val.every((valT: any) => valT >= comp)
      break
    case 'all<=to':
      res = val.every((valT: any) => valT <= comp)
      break
    case 'all===to':
      res = val.every((valT: any) => valT === comp)
      break
    case 'some>than':
      res = val.some((valT: any) => valT > comp)
      break
    case 'some<than':
      res = val.some((valT: any) => valT < comp)
      break
    case 'some>=to':
      res = val.some((valT: any) => valT >= comp)
      break
    case 'some<=to':
      res = val.some((valT: any) => valT <= comp)
      break
    case 'some===to':
      res = val.some((valT: any) => valT === comp)
      break
    default:
      return false
  }

  return inverse ? !res : res
}

/**
 * Run a query to filter out specific documents
 * @ignore
 * @param queryArr Array of query objects to run/loop through
 * @param col Collection to run query on
 * @param seedDocs Document array to filter, either from the collection, or from recursion
 * @category Query
 */
export const runQuery = (
  queryArr: Query[] | QueryBuilder,
  col: DBCollection,
  seedDocs: DBDoc[],
  nested_?: Debugger,
  nestedOp_?: Operators
): DBDoc[] => {
  let queries: Query[] = []
  // Debugger variable
  const _ = nested_
    ? nested_.extend(`<query>${nestedOp_}`)
    : col.col_.extend('query')

  if (queryArr.constructor.name === 'QueryBuilder') {
    queries = (<QueryBuilder>queryArr).queries
  } else queries = queryArr as Query[]

  /* DEBUG */ _(
    'Querying collection `%s`. %d queries left to execute',
    col.name,
    queries.length
  )

  return queries.reduce<DBDoc[]>((docs, query, i, queries) => {
    // Return filtered documents if there are none left, or if the query array is empty
    if (docs.length === 0) {
      /* DEBUG */ _(
        'Query on collection `%s` completed, %d documents left with %d queries left to execute',
        col.name,
        docs.length,
        queries.length - i
      )
      return docs
    }

    // Check to see if the collection schema has the provided key
    if (
      query.key === '_updatedAt' ||
      query.key === '_createdAt' ||
      query.key === 'id' ||
      nestedKey(col.schema, query.key) !== undefined ||
      (query.key === '' &&
        (query.operation === '&&' || query.operation === '||') &&
        Array.isArray(query.comparison))
    ) {
      /* DEBUG */ _(
        'Collection contains key `%s`, querying key with operator `%s`',
        query.key,
        query.operation
      )
      // Run the specified query
      switch (query.operation) {
        case '||':
          // Run multiple queries and combine the results of all of them

          // Create a temporary array for the documents for filtering later on
          let tmpOr: DBDoc[] = []

          // Map over the comparison array of queries and run them
          query.comparison.map((orQuery: Query) =>
            tmpOr.push(
              // Push all the results to the temp array
              ...runQuery(
                [
                  {
                    ...orQuery,
                    inverse: query.inverse
                      ? !orQuery.inverse
                      : !!orQuery.inverse,
                  },
                ],
                col,
                docs,
                _,
                '||'
              )
            )
          )

          // Inverse the or query
          if (query.inverse) {
            // Get an array of all the document IDs for filtering
            const idArrOr = tmpOr.map((doc) => doc.id)

            docs = docs.filter((doc) => !idArrOr.includes(doc.id))
          }
          // Filter out documents that exist multiple times in the array.
          else docs = [...new Set(tmpOr)]

          break
        case '&&':
          if (!Array.isArray(query.comparison)) break

          // Run an && query (what would go within an || query)
          const tmpAnd = runQuery(
            <Query[] | QueryBuilder>query.comparison,
            col,
            docs,
            _,
            '&&'
          )

          // Handle inversing the results of the AND query
          if (query.inverse) {
            const idArrAnd = tmpAnd.map((doc) => doc.id)

            docs = docs.filter((doc) => !idArrAnd.includes(doc.id))
          } else docs = tmpAnd

          break
        default:
          docs = docs.filter((doc) => compare(doc, query))
          break
      }
    }

    /* DEBUG */ _(
      'Query on collection `%s` continuing with %d documents left and %d queries left to execute',
      col.name,
      docs.length,
      queries.length - i
    )

    return docs
  }, seedDocs)
}

type WhereCallback = (query: QueryBuilder) => QueryBuilder

/**
 * Helper function to easily generate queries
 * @example Simple example showing a basic set of where's (&& together) to get documents with a value between (inclusive) 40 and 50
 * ```typescript
 * const query = QueryBuilder
 *   .where('myKey', '>=' 40)
 *   .where('myKey', '<=', 50)
 * ```
 *
 * @example Using the orWhere function to generate OR queries
 * ```typescript
 * const query = QueryBuilder
 *   .orWhere(or => or
 *     .where('myKey', '===', true)
 *     .where('mySecondKey', '===', 52, true)
 *   )
 * ```
 * ```sql
 * -- The equivalent SQL query would be as follows --
 * SELECT
 *   *
 * FROM
 *   collection
 * WHERE
 *   myKey = TRUE
 *   AND mySecondKey != 52
 * ```
 *
 * @example Nested AND queries in an OR query
 * ```typescript
 * const query = QueryBuilder
 *   .orWhere(or => or
 *     .andWhere(
 *       and => and
 *         .where('key1', '===', 21)
 *         .where('key2', '===', 'boop')
 *     )
 *     .andWhere(
 *       and => and
 *         .where('key3', '>=', 1)
 *         .where('key4', '<=', 100)
 *     )
 *   )
 * ```
 * ```typescript
 * // The above is kind of like the following if statement
 * if(
 *   (
 *     key1 === 21 &&
 *     key2 === 'boop'
 *   ) ||
 *   (
 *     key3 >= 1 &&
 *     key4 <= 100
 *   )
 * )
 * ```
 * ```sql
 * -- Or like the following SQL query --
 * SELECT
 *   *
 * FROM
 *   collection
 * WHERE
 *   (
 *     key1 = 21
 *     AND key2 = 'boop'
 *   )
 *   OR (
 *     key3 >= 1
 *     AND key4 <= 100
 *   )
 * ```
 * @category Query
 */
export class QueryBuilder {
  queries: Query[] = []

  constructor() {}

  /**
   * Generate a new query for the array
   * @param key Key to search on (run through nestedKey function)
   * @param operation Comparison operation to use
   * @param comparison What to compare against
   * @param inverse Inverse the result of the where query
   */
  where(
    key: string,
    operation: Operators,
    comparison: any,
    inverse: boolean = false
  ) {
    this.queries.push({
      key,
      operation,
      comparison,
      inverse,
    })
    return this
  }

  /**
   * Generate a new query for the array
   * @param key Key to search on (run through nestedKey function)
   * @param operation Comparison operation to use
   * @param comparison What to compare against
   * @param inverse Inverse the result of the where query
   */
  static where(
    key: string,
    operation: Operators,
    comparison: any,
    inverse: boolean = false
  ) {
    return new QueryBuilder().where(key, operation, comparison, inverse)
  }

  /**
   * Generate a nested || query
   * @param queryFunc callback for generating || queries with a nested QueryBuilder
   */
  orWhere(queryFunc: WhereCallback) {
    const { queries } = queryFunc(new QueryBuilder())

    return this.where('', '||', queries)
  }

  /**
   * Generate a nested || query
   * @param queryFunc callback for generating || queries with a nested QueryBuilder
   */
  static orWhere(queryFunc: WhereCallback) {
    const { queries } = queryFunc(new QueryBuilder())

    return QueryBuilder.where('', '||', queries)
  }

  /**
   * Generate && queries for nesting within || queries
   * @param queryFunc callback for generating queries with a nested QueryBuilder
   */
  andWhere(queryFunc: WhereCallback) {
    const { queries } = queryFunc(new QueryBuilder())

    return this.where('', '&&', queries)
  }

  /**
   * Generate && queries for nesting within || queries
   * @param queryFunc callback for generating queries with a nested QueryBuilder
   */
  static andWhere(queryFunc: WhereCallback) {
    const { queries } = queryFunc(new QueryBuilder())

    return QueryBuilder.where('', '&&', queries)
  }
}

