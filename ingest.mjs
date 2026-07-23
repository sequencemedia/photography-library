/**
 *  @typedef {import('node:fs').Stats} Stats
 *  @typedef {import('#types').RecordFilterType} RecordFilterType
 *  @typedef {import('#types').RecordUpdateType} RecordUpdateType
 *  @typedef {import('#types').WriteItemType} WriteItemType
 *  @typedef {{
 *    updateOne: WriteItemType & { upsert: true }
 *  }} BulkWriteItemType
 *  @typedef {{
 *    filter: RecordFilterType
 *    update: Omit<RecordUpdateType, 'hash'>
 *  }} QueueItemType
 *  @typedef {Map<string, QueueItemType>} IngestionQueueType
 */

import debug from 'debug'
import {
  join
} from 'node:path'
import {
  glob,
  stat
} from 'node:fs/promises'
import {
  MB,
  normalisePath,
  getFileHash,
  LibraryModel,
  round,
  reduceSize,
  renderTiming,
  renderFilePath
} from '#common'
import error from '#common/report/error'

const log = debug('@sequencemedia/photography-library:ingest')
const info = debug('@sequencemedia/photography-library:ingest:info')

const BATCH = 8

const OPTIONS = {
  /**
   * @param {string} fileName
   * @returns {boolean}
   */
  exclude (fileName) {
    return fileName === '@eaDir'
  }
}

/**
 *  @param {string} filePath
 *  @param {QueueItemType} queueItem
 *  @returns {Promise<WriteItemType>}
 */
async function toWriteItem (filePath, { filter, update }) {
  const hash = await getFileHash(filePath)

  return {
    filter,
    update: {
      ...update,
      hash
    }
  }
}

/**
 *  @param {string} filePath
 *  @param {QueueItemType} queueItem
 *  @returns {Promise<BulkWriteItemType>}
 */
async function toBulkWriteItem (filePath, queueItem) {
  const writeItem = await toWriteItem(filePath, queueItem)

  return {
    updateOne: {
      ...writeItem,
      upsert: true
    }
  }
}

/**
 *  @param {[string, QueueItemType]} queueItem
 *  @returns {Promise<BulkWriteItemType>}
 */
function fromEntry ([filePath, queueItem]) {
  return toBulkWriteItem(filePath, queueItem)
}

/**
 *  @param {IngestionQueueType} alpha
 */
async function writeQueue (alpha) {
  try {
    const total = round(alpha.values().reduce(reduceSize, 0) / MB)
    log(`Hashing ${total + 'MB'} ...`)

    const s = new Date()
    const omega = await Promise.all(alpha.entries().map(fromEntry))
    const e = new Date()

    log(alpha.size, renderTiming(s, e))

    log('Writing ...')
    await LibraryModel.bulkWrite(omega)
    log('Written')
  } catch (e) {
    error(e)
  }
}

/**
 *  @param {{
 *    from: string,
 *    to?: string,
 *    pattern: string,
 *    batch?: number
 *  }} params
 *  @returns {Promise<void>}
 */
export default async function ingest ({ from, to = from, pattern, batch = BATCH }) {
  /**
   *  @type {IngestionQueueType}
   */
  const ingestionQueue = new Map()

  const FROM = normalisePath(from)
  const TO = normalisePath(to)

  info(pattern, batch)

  for await (const filePath of glob(join(FROM, pattern), OPTIONS)) {
    const stats = await stat(filePath)
    if (stats.isFile()) {
      info(renderFilePath(filePath))

      const FILE_PATH = filePath.replace(FROM, TO)

      const recordItem = await LibraryModel.findOne({
        filePath: FILE_PATH
      })

      if (!recordItem || (
        recordItem.size !== stats.size ||
        recordItem.mtimeMs !== stats.mtimeMs ||
        recordItem.ctimeMs !== stats.ctimeMs)) {
        const {
          atime,
          atimeMs,
          mtime,
          mtimeMs,
          ctime,
          ctimeMs,
          birthtime,
          birthtimeMs,
          size
        } = stats

        ingestionQueue.set(filePath, {
          filter: {
            filePath: FILE_PATH
          },
          update: {
            atime,
            atimeMs,
            mtime,
            mtimeMs,
            ctime,
            ctimeMs,
            birthtime,
            birthtimeMs,
            size
          }
        })

        if (ingestionQueue.size === batch) {
          await writeQueue(ingestionQueue)
          ingestionQueue.clear()
        }
      }
    }
  }

  if (ingestionQueue.size) {
    await writeQueue(ingestionQueue)
    ingestionQueue.clear()
  }

  log('Done')
}
