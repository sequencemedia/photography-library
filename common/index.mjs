import debug from 'debug'
import {
  homedir
} from 'node:os'
import {
  createReadStream
} from 'node:fs'
import {
  createHash
} from 'node:crypto'
import {
  Worker
} from 'node:worker_threads'
import mongoose from 'mongoose'
import {
  differenceInSeconds,
  differenceInMinutes
} from 'date-fns'
import error from '#common/report/error'

const log = debug('@sequencemedia/photography-library:common')
const info = debug('@sequencemedia/photography-library:common:info')

export const DISCONNECTED = 0
export const CONNECTED = 1
export const CONNECTING = 2
export const DISCONNECTING = 3

export const KB = 1024
export const MB = KB * 1000
export const GB = MB * 1000

const archiveSchema = new mongoose.Schema({
  filePath: { type: String, index: true }, // not unique
  hash: { type: String, index: true },
  atime: Date,
  mtime: Date,
  ctime: Date,
  birthtime: Date,
  atimeMs: Number,
  mtimeMs: Number,
  ctimeMs: Number,
  birthtimeMs: Number,
  size: Number
},
{
  collection: 'Archive',
  versionKey: false,
  timestamps: true
})

const librarySchema = new mongoose.Schema({
  filePath: { type: String, index: true, unique: true }, // unique
  hash: { type: String, index: true },
  atime: Date,
  mtime: Date,
  ctime: Date,
  birthtime: Date,
  atimeMs: Number,
  mtimeMs: Number,
  ctimeMs: Number,
  birthtimeMs: Number,
  size: Number
},
{
  collection: 'Library',
  versionKey: false,
  timestamps: true
})

export const ArchiveModel = mongoose.model('Archive', archiveSchema)

export const LibraryModel = mongoose.model('Library', librarySchema)

/**
 * @param {string} [url]
 * @returns {Promise<mongoose.Mongoose | void>}
 */
export async function connect (url = 'mongodb://127.0.0.1:27017/photography-library') {
  const {
    connection: {
      readyState = DISCONNECTED
    }
  } = mongoose

  if (readyState < CONNECTED) {
    return mongoose.connect(url)
  }
}

/**
 * @returns {Promise<mongoose.Mongoose | void>}
 */
export async function disconnect () {
  const {
    connection: {
      readyState = DISCONNECTED
    }
  } = mongoose

  if (readyState !== DISCONNECTED) {
    return mongoose.disconnect()
  }
}

/**
 *  @param {unknown | null} value
 *  @returns {string}
 */
export function normalisePath (value) {
  return String(value ?? '').trim().replace(/^~/, homedir())
}

/**
 * @param {number} n
 * @returns {number}
 */
export function round (n) {
  return Number((Math.round(n * 100) / 100).toFixed(2))
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export function getFileHash (filePath) {
  return (
    new Promise((resolve, reject) => {
      const hash = createHash('sha256')

      info(renderFilePath(filePath))

      const s = new Date()
      createReadStream(filePath)
        .on('error', (e) => {
          error(e)

          reject(e)
        })
        .on('data', (chunk) => { hash.update(chunk) })
        .on('end', () => {
          log(renderFilePath(filePath), renderTiming(s, new Date()))

          resolve(hash.digest('hex'))
        })
    })
  )
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export function getFileHashFromWorker (filePath) {
  return (
    new Promise((resolve, reject) => {
      const worker = new Worker('./worker/hash-worker.mjs', { workerData: filePath })

      worker.on('message', function handleMessage ({ type, ...message }) {
        switch (type) {
          case 'hash':
          {
            /**
             *  @type {{ hash: string }}
             */
            const { hash } = message
            resolve(hash)
            break
          }
          case 'error':
          {
            /**
             *  @type {{ error: string }}
             */
            const { error } = message
            reject(error)
            break
          }
        }
      })
    })
  )
}

/**
 *  @param {number} size
 *  @param {{ update: { size: number } }} item
 *  @returns {number}
 */
export function reduceSize (size, { update }) {
  return size + (update.size ?? 0)
}

/**
 * @param {Date} s
 * @param {Date} e
 * @returns {string}
 */
export function renderTiming (s, e) {
  const [a, o] = s < e ? [e, s] : [s, e]
  const secs = differenceInSeconds(a, o)
  const mins = differenceInMinutes(a, o)
  return `• ${secs + 's'} (${mins + 'm'})`
}

/**
 *  @param {string} s
 *  @returns {string}
 */
export function renderFilePath (s) {
  if (s.length >= 112) return '... ' + s.slice(-108) // s.slice(0, 22) + ' ... ' + s.slice(-85)
  return s // .padStart(112, ' ')
}
