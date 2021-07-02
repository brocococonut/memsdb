import { DBDoc } from '../doc'
import { Data, StorageProvider } from '../types/storageProvider'
const localStorage = window.localStorage

/**
 * Save and load backups from localStorage - may be subject to localstorage size limits
 * @category Storage Provider
 */
export class LocalStorage implements StorageProvider {
  constructor() {}

  load(doc: DBDoc) {
    const data = localStorage.getItem(doc.id)

    if (data) return JSON.parse(data)
    else return {}
  }

  save(doc: DBDoc, data: Data) {
    localStorage.setItem(doc.id, JSON.stringify(data))

    return true
  }

  delete(doc: DBDoc) {
    localStorage.removeItem(doc.id)
  }
}
