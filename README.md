# memsdb
A simple in memory DB - Created to experiment more with typescript and classes

Initialising a new database:
```javascript
const db = new DB('My DB Name')
```

Creating and assigning new collections to the db:
```javascript
const db = new DB('My DB Name')

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
```javascript
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
  by: 'Me'
})
```

Finding documents in a collection:
```javascript
const db = new DB('My DB Name')

const comments = new DBCollection(db, {
  name: 'comments',
  structure: {
    text: '',
    by: '',
    parent: '',
  },
})

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

The query language is still rather simple but can support the operators: `<`, `>`, `<=`, `>=`, `===`, and `||` - where `||` runs an OR using an array of `Query` objects (supports multi-level ORing).