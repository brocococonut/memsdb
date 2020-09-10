import { Query } from "../types";
import { DBCollection } from "../collection";
import { DBDoc } from "../doc";
import { nestedKey } from "./key";
import { getOrCreateIndex } from "./indexed";

/**
 * Run a query to filter out specific documents
 * @param queryArr Array of query objects to run/loop through
 * @param col Collection to run query on
 * @param seedDocs Document array to filter, either from the collection, or from recursion
 */
export const runQuery = (
  queryArr: Query[],
  col: DBCollection,
  seedDocs: DBDoc[]
): DBDoc[] => {
  // Debugger variable
  const _ = col.col_.extend("query");

  /* DEBUG */ _(
    "Querying collection `%s`. %d queries left to execute",
    col.name,
    queryArr.length
  );

  return queryArr.reduce<DBDoc[]>((docs, query, i, queries) => {
    // Return filtered documents if there are none left, or if the query array is empty
    if (docs.length === 0) {
      /* DEBUG */ _(
        "Query on collection `%s` completed, %d documents left with %d queries left to execute",
        col.name,
        docs.length,
        queries.length - i
      );
      return docs;
    }

    // Check to see if the collection schema has the provided key
    if (nestedKey(col.schema, query.key) !== undefined || query.key === '_updatedAt' || query.key === '_createdAt') {
      /* DEBUG */ _(
        "Collection contains key `%s`, querying key with operator `%s`",
        query.key,
        query.operation
      );
      // Run the specified query
      switch (query.operation) {
        case "<":
          // Filter out documents where the target is less than the provided value
          docs = docs.filter((doc) => {
            const res = getOrCreateIndex({ doc, query }) < query.comparison;

            return query.inverse ? !res : res;
          });
          break;
        case ">":
          // Filter out documents where the target is greater than the provided value
          docs = docs.filter((doc) => {
            const res = getOrCreateIndex({ doc, query }) > query.comparison;

            return query.inverse ? !res : res;
          });
          break;
        case "<=":
          // Filter out documents where the target is less than or equal to the the provided value
          docs = docs.filter((doc) => {
            const res = getOrCreateIndex({ doc, query }) <= query.comparison;

            return query.inverse ? !res : res;
          });
          break;
        case ">=":
          // Filter out documents where the target is greater than or equal tothe provided value
          docs = docs.filter((doc) => {
            const res = getOrCreateIndex({ doc, query }) >= query.comparison;

            return query.inverse ? !res : res;
          });
          break;
        case "===":
          // Filter out documents where the target isn't equal to the provided value
          docs = docs.filter((doc) => {
            const res = getOrCreateIndex({ doc, query }) === query.comparison;

            return query.inverse ? !res : res;
          });
          break;
        case "includes":
          // Filter out documents that don't include the comparison
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });

            let res;
            if (Array.isArray(val)) res = val.includes(query.comparison);
            else return false;

            return query.inverse ? !res : res;
          });
          break;
        case "isContainedIn":
          if (!Array.isArray(query.comparison)) break;
          const cComparison = query.comparison;

          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });

            let res;
            if (Array.isArray(val))
              res = val.every((valT) => cComparison.includes(valT));
            else return (res = cComparison.includes(val));

            return query.inverse ? !res : res;
          });
          break;
        case "hasAllOf":
          // Filter out documents that don't have ALL of the comparison values
          if (!Array.isArray(query.comparison)) break;
          const aComparison = query.comparison;

          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });

            if (!Array.isArray(val)) return false;

            const res = aComparison.every((comparison) =>
              val.includes(comparison)
            );

            return query.inverse ? !res : res;
          });
          break;
        case "||":
          // Run multiple queries and combine the results of all of them

          // Create a temporary array for the documents for filtering later on
          let tmp: DBDoc[] = [];

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
                docs
              )
            )
          );

          // Get an array of all the document IDs for filtering
          const idArr = tmp.map((doc) => doc.id);

          // Filter out documents that exist multiple times in the array.
          docs = tmp.filter((doc, i) => i === idArr.indexOf(doc.id));
          break;
        case "all>than":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.every((valT) => valT > query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "all<than":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.every((valT) => valT < query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "all>=to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.every((valT) => valT >= query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "all<=to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.every((valT) => valT <= query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "all===to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.every((valT) => valT === query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "some>than":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.some((valT) => valT > query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "some<than":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.some((valT) => valT < query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "some>=to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.some((valT) => valT >= query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "some<=to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.some((valT) => valT <= query.comparison);

            return query.inverse ? !res : res;
          });
          break;
        case "some===to":
          docs = docs.filter((doc) => {
            const val = getOrCreateIndex({ doc, query });
            if (!Array.isArray(val)) return false;

            const res = val.some((valT) => valT === query.comparison);

            return query.inverse ? !res : res;
          });
          break;
      }
    }

    /* DEBUG */ _(
      "Query on collection `%s` continuing with %d documents left and %d queries left to execute",
      col.name,
      docs.length,
      queries.length - i
    );

    return docs;
  }, seedDocs);
};
