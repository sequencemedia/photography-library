#!/usr/bin/env node

import 'dotenv/config'
import debug from 'debug'
import {
  connect,
  disconnect
} from '#common'
import complete from '#common/report/complete'
import error from '#common/report/error'
import ingest from './ingest.mjs'

const log = debug('@sequencemedia/photography-library')

const {
  env: {
    LIBRARY_FROM: FROM = '/',
    LIBRARY_TO: TO,
    LIBRARY_MONGODB: MONGODB = 'mongodb://127.0.0.1:27017/photography-library',
    LIBRARY_BATCH = 8
  }
} = process

const PATTERN = '/**/*.{cr2,CR2}'
const BATCH = LIBRARY_BATCH ? Number(LIBRARY_BATCH) : NaN

const params = {
  from: FROM,
  to: TO,
  pattern: PATTERN,
  ...(isNaN(BATCH)) ? {} : { batch: BATCH }
}

log('🚀', params)
connect(MONGODB)
  .then(() => ingest(params))
  .then(complete)
  .catch(error)
  .finally(disconnect)
