# memsdb
A simple in memory DB - Created to experiment more with typescript and classes

Initialising a new database:
```typescript
import { DB } from 'memsdb'

const db = new DB('My DB Name')
```

Creating and assigning new collections to the db:
```typescript
const comments = new DBCollection(db, {
  name: 'comments',
  structure: {
    text: '',
    by: '',
    parent: '',
  },
})
```

Adding documents to an existing collection:
```typescript
comments.insertOne({
  text: `My fantastic comment`,
  by: 'me'
})
```

Finding documents in a collection:
```typescript
/**
 * Find all documents where the `by` field is equal to 'me'
 */
comments.find([{
  key: 'by',
  operation: '===',
  comparison: 'me'
}])

/**
 * Find a document by it's id
 */
comments.id('0123456789abcdef01245678')
```

Full example:
```typescript
import { DB } from 'memsdb'

const db = new DB('My DB Name')

const comments = new DBCollection(db, {
  name: 'comments',
  structure: {
    text: '',
    by: '',
    parent: '',
  },
})

comments.insertOne({
  text: `My fantastic comment`,
  by: 'me'
})

const docs = comments.find([{
  key: 'by',
  operation: '===',
  comparison: 'me'
}])

// docs should contain the one comment we added
```

The query language is still rather simple but can support the operators: `<` | `>` | `<=` | `>=` | `===` | `||` | `includes` | `isContainedIn` | `hasAllOf` | `all>than` | `all<than` | `all>=to` | `all<=to` | `all===to` | `some>than` | `some<than` | `some>=to` | `some<=to` | `some===to` - where `||` runs an OR using an array of `Query` objects (supports multi-level ORing).

An example query object of:
```typescript
const query = {
  key: 'by',
  operation: '===',
  comparison: 'me'
}
```
should be read as `document.by (key to get value of) '===' 'me' (value)`

The `some===to` key (`some*`, `all*`) can be used to find similarities between different arrays

`all===to` makes sure that all of the specified key is equal to the comparison. This would usually be useful with query keys that specify an array  with objects in it like the following: `folder.children.[].exists`. In the previous example you'd use `all===to` to make sure that all child folders of the first level have the property `exists` and that it's equal to whatever comparison value you set in the query. Eg.:
```
const query = {
  key: 'folder.children.[].exists',
  operation: 'all===to',
  comparison: true'
}

Other functions on the database, collections, and documents can be read in the docs