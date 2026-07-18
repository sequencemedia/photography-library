/**
 *  @typedef {import('node:fs').Stats} Stats
 *  @typedef {import('#types').IngestFilterType} IngestFilterType
 *  @typedef {import('#types').IngestUpdateType} IngestUpdateType
 *  @typedef {import('#types').IngestItemType} IngestItemType
 *  @typedef {import('#types').RecordFilterType} RecordFilterType
 *  @typedef {import('#types').RecordUpdateType} RecordUpdateType
 *  @typedef {import('#types').RecordItemType} RecordItemType
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
  reduceItemsSize,
  renderTiming,
  renderFilePath
} from '#common'
import reportError from '#common/report-error'

const BATCH = 8

const log = debug('@sequencemedia/photography-library:ingest')
const info = debug('@sequencemedia/photography-library:ingest:info')

const OPTIONS = {
  /**
   * @param {string} fileName
   * @returns
   */
  exclude (fileName) {
    return fileName === '@eaDir'
  }
}

/**
 *  @param {IngestItemType & { update: { hash: string }}} ingestItem
 *  @returns {RecordItemType}
 */
function toRecordItem ({ filter, update }) {
  return {
    filter,
    update,
    upsert: true
  }
}

/**
 *  @param {RecordItemType} recordItem
 *  @returns {{
 *    updateOne: RecordItemType
 *  }}
 */
function fromRecordItem (recordItem) {
  return {
    updateOne: recordItem
  }
}

/**
 *  @param {string} filePath
 *  @param {IngestItemType} ingestItem
 *  @returns {Promise<IngestItemType & { update: { hash: string } }>}
 */
async function renderIngestItemHash (filePath, { filter, update }) {
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
 *  @param {Map<string, IngestItemType>} alpha
 *  @param {number} batch
 */
async function execute (alpha, batch = alpha.size) {
  try {
    const total = round(alpha.values().reduce(reduceItemsSize, 0) / MB)
    log(`Hashing ${total + 'MB'} ...`)

    const s = new Date()
    const omega = await Promise.all(alpha.entries().map(([filePath, ingestItem]) => renderIngestItemHash(filePath, ingestItem)))
    const e = new Date()

    log(batch, renderTiming(s, e))

    log('Writing ...')
    await LibraryModel.bulkWrite(omega.map(toRecordItem).map(fromRecordItem))
    log('Written')
  } catch (e) {
    reportError(e)
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
export default async function ingest ({ from, pattern, to = from, batch = BATCH }) {
  /**
   *  @type {Map<string, IngestItemType>}
   */
  const ingestItems = new Map()

  info(pattern, batch)

  for await (const filePath of glob(join(normalisePath(from), pattern), OPTIONS)) {
    info(renderFilePath(filePath))

    const stats = await stat(filePath)
    if (stats.isFile()) {
      const recordItem = await LibraryModel.findOne({
        filePath: filePath.replace(from, to)
      })

      if (!recordItem || (
        recordItem.size !== stats.size ||
        recordItem.mtimeMs !== stats.mtimeMs ||
        recordItem.ctimeMs !== stats.ctimeMs)) {
        const {
          atime,
          mtime,
          ctime,
          birthtime,
          atimeMs,
          mtimeMs,
          ctimeMs,
          birthtimeMs,
          size
        } = stats

        ingestItems.set(filePath, {
          filter: {
            filePath: filePath.replace(from, to)
          },
          update: {
            atime,
            mtime,
            ctime,
            birthtime,
            atimeMs,
            mtimeMs,
            ctimeMs,
            birthtimeMs,
            size
          }
        })

        if (ingestItems.size === batch) {
          await execute(ingestItems, batch)
          ingestItems.clear()
        }
      }
    }
  }

  if (ingestItems.size) {
    await execute(ingestItems)
    ingestItems.clear()
  }

  log('Done')
}
