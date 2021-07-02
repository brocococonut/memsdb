import { DBDoc } from '../doc'
import { Data, StorageProvider } from '../types/storageProvider'

/**
 * Save and load backups from localStorage - may be subject to localstorage
 * size limits
 * @category Storage Provider
 */
export class MemoryStorage implements StorageProvider {
  constructor() {}

  load(doc: DBDoc) {
    return doc.pluginData.get('memoryStorage') 
  }

  save(doc: DBDoc, data: Data) {
    doc.pluginData.set('memoryStorage', data)

    return true
  }

  delete(doc: DBDoc) {
    doc.pluginData.delete('memoryStorage')
  }
}
