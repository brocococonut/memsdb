import { DBCollection } from '../collection'
import { CustomPopulateQuery } from '../types'
import { QueryBuilder } from '../utils/query'
import { Query } from './query'

export interface DocumentCustomPopulateOpts {
  srcField: string
  targetField?: string
  targetCol: DBCollection
  query?: Query[] | QueryBuilder
  destinationField?: string
  unwind?: boolean
}

export interface DocumentTreeOpts {
  populations?: CustomPopulateQuery[]
  maxDepth?: number
  currentDepth?: number
}
