import debug from 'debug'
import {
  workerData,
  parentPort
} from 'node:worker_threads'
import {
  createHash
} from 'node:crypto'
import {
  createReadStream
} from 'node:fs'
import {
  renderFilePath,
  renderTiming
} from '#common'
import reportError from '#common/report-error'

const log = debug('@sequencemedia/photography-library:worker')
const info = debug('@sequencemedia/photography-library:worker:info')

const hash = createHash('sha256')

info(renderFilePath(workerData))

const s = new Date()
createReadStream(workerData)
  .on('error', (e) => {
    reportError(e)

    if (parentPort) parentPort.postMessage({ type: 'error', error: e })
  })
  .on('data', (chunk) => { hash.update(chunk) })
  .on('end', () => {
    log(renderFilePath(workerData), renderTiming(s, new Date()))

    if (parentPort) parentPort.postMessage({ type: 'hash', hash: hash.digest('hex') })
  })
