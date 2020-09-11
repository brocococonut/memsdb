import { DBCollection } from "./collection";

/** Base template of a schema/collection */
export interface SchemaTemplateType {
  /** Name of the collection schema */
  name: string;
  /**
   * Structure of the collection. A key's value will be treated as
   * the default value for that key
   */
  structure: { [key: string]: any };
}

export type Operators =
  | "<"
  | ">"
  | "<="
  | ">="
  | "==="
  | "||"
  | "includes"
  | "isContainedIn"
  | "hasAllOf"
  | "all>than"
  | "all<than"
  | "all>=to"
  | "all<=to"
  | "all===to"
  | "some>than"
  | "some<than"
  | "some>=to"
  | "some<=to"
  | "some===to";

/** Query interface */
export interface Query {
  /** Key to run the query on */
  key: string;
  /** Inverse result requirement */
  inverse?: boolean;
  /** Operation to perform */
  operation: Operators;
  /** Value to compare against */
  comparison: any | Query[];
  reactiveQuery?: boolean;
}

/** Population specific query */
export interface PopulateQuery {
  /* Where on the source doc to compare to */
  srcField: string;
  /* Where on the comparison doc to compare to */
  targetField: string;
  /* Where to place the child documents matching this query */
  destinationField: string;
  /* The collection to pull child documents from for this query */
  collection: DBCollection;
}
