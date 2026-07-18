/**
 *  @typedef {import('node:fs').Stats} Stats
 *  @typedef {import('#types').RecordType} RecordType
 */

import debug from 'debug'
import {
  constants
} from 'node:fs'
import {
  access
} from 'node:fs/promises'
import {
  LibraryModel,
  ArchiveModel,
  renderFilePath
} from '#common'

const log = debug('@sequencemedia/photography-library:clean-up')
const info = debug('@sequencemedia/photography-library:clean-up:info')

/**
 *  @param {{
 *    from: string,
 *    to?: string
 *  }} params
 *  @returns {Promise<void>}
 */
export default async function cleanUp ({ from, to = from }) {
  const cursor = LibraryModel.find().cursor()

  for await (const recordItem of cursor) {
    const {
      filePath
    } = recordItem

    if (filePath) {
      info(renderFilePath(filePath))

      try {
        await access(filePath.replace(to, from), constants.R_OK | constants.W_OK)
      } catch {
        const {
          id,
          atime,
          atimeMs,
          birthtime,
          birthtimeMs,
          ctime,
          ctimeMs,
          hash,
          mtime,
          mtimeMs,
          size
        } = recordItem

        log('Writing ...')
        await ArchiveModel.updateOne({
          filePath,
          size,
          birthtimeMs
        },
        {
          filePath,
          atime,
          atimeMs,
          birthtime,
          birthtimeMs,
          ctime,
          ctimeMs,
          hash,
          mtime,
          mtimeMs,
          size
        }, { upsert: true })

        await LibraryModel.deleteOne({ _id: id })
        log('Written')
      }
    }
  }

  log('Done')
}
