/** Device-only originals for the privacy-preserving photo pipeline. */
const DATABASE_NAME = 'refit-local-photos'
const STORE_NAME = 'photos'
const DATABASE_VERSION = 1

export type LocalPhotoKind = 'reference' | 'user'
type PhotoRecord = { key: string; sessionId: string; kind: LocalPhotoKind; file: File }

function key(sessionId: string, kind: LocalPhotoKind) { return `${sessionId}:${kind}` }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function saveLocalPhoto(sessionId: string, kind: LocalPhotoKind, file: File) {
  await run('readwrite', store => store.put({ key: key(sessionId, kind), sessionId, kind, file } satisfies PhotoRecord))
}

export async function getLocalPhoto(sessionId: string, kind: LocalPhotoKind): Promise<File | null> {
  const record = await run<PhotoRecord | undefined>('readonly', store => store.get(key(sessionId, kind)))
  return record?.file ?? null
}

export async function deleteLocalSessionPhotos(sessionId: string) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if ((cursor.value as PhotoRecord).sessionId === sessionId) cursor.delete()
        cursor.continue()
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}
