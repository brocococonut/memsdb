import { Query } from "../types";
import { DBCollection } from "../collection";
import { DBDoc } from "../doc";
import { nestedKey } from "./key";
import { getOrCreateIndex } from "./indexed";

const compare = (doc: DBDoc, query: Query): boolean => {
  const val = getOrCreateIndex({ doc, query });
  const op = query.operation;
  const comp = query.comparison;
  let res = false;

  if (
    (op === "hasAllOf" ||
      op === "all>than" ||
      op === "all<than" ||
      op === "all>=to" ||
      op === "all<=to" ||
      op === "all===to" ||
      op === "some>than" ||
      op === "some<than" ||
      op === "some>=to" ||
      op === "some<=to" ||
      op === "some===to") &&
    !Array.isArray(val)
  )
    return false;

  switch (query.operation) {
    case "<":
      // Filter out documents where the target is less than the provided value
      res = getOrCreateIndex({ doc, query }) < query.comparison;

      break;
    case ">":
      // Filter out documents where the target is greater than the provided value
      res = getOrCreateIndex({ doc, query }) > query.comparison;

      break;
    case "<=":
      // Filter out documents where the target is less than or equal to the the provided value
      res = getOrCreateIndex({ doc, query }) <= query.comparison;

      break;
    case ">=":
      // Filter out documents where the target is greater than or equal tothe provided value
      res = getOrCreateIndex({ doc, query }) >= query.comparison;

      break;
    case "===":
      // Filter out documents where the target isn't equal to the provided value
      res = getOrCreateIndex({ doc, query }) === query.comparison;

      break;
    case "includes":
      // Filter out documents that don't include the comparison
      if (Array.isArray(val)) res = val.includes(query.comparison);
      else return false;

      break;
    case "isContainedIn":
      if (!Array.isArray(comp)) break;

      if (Array.isArray(val)) res = val.every((valT) => comp.includes(valT));
      else return (res = comp.includes(val));

      break;
    case "hasAllOf":
      // Filter out documents that don't have ALL of the comparison values
      if (!Array.isArray(comp)) return false;

      res = comp.every((comparison) => val.includes(comparison));
      break;
    case "all>than":
      res = val.every((valT: any) => valT > comp);
      break;
    case "all<than":
      res = val.every((valT: any) => valT < comp);
      break;
    case "all>=to":
      res = val.every((valT: any) => valT >= comp);
      break;
    case "all<=to":
      res = val.every((valT: any) => valT <= comp);
      break;
    case "all===to":
      res = val.every((valT: any) => valT === comp);
      break;
    case "some>than":
      res = val.some((valT: any) => valT > comp);
      break;
    case "some<than":
      res = val.some((valT: any) => valT < comp);
      break;
    case "some>=to":
      res = val.some((valT: any) => valT >= comp);
      break;
    case "some<=to":
      res = val.some((valT: any) => valT <= comp);
      break;
    case "some===to":
      res = val.some((valT: any) => valT === comp);
      break;
    default:
      return false;
  }

  return query.inverse ? !res : res;
};

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
    if (
      nestedKey(col.schema, query.key) !== undefined ||
      query.key === "_updatedAt" ||
      query.key === "_createdAt"
    ) {
      /* DEBUG */ _(
        "Collection contains key `%s`, querying key with operator `%s`",
        query.key,
        query.operation
      );
      // Run the specified query
      switch (query.operation) {
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
        default:
          docs = docs.filter((doc) => compare(doc, query));
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
