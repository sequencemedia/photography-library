#!/usr/bin/env node

import 'dotenv/config'
import debug from 'debug'
import {
  connnect,
  disconnnect
} from '#common'
import reportComplete from '#common/report-complete'
import reportError from '#common/report-error'
import ingest from './ingest.mjs'

const log = debug('@sequencemedia/photography-library')

const {
  env: {
    LIBRARY_FROM: FROM = '/',
    LIBRARY_TO: TO,
    LIBRARY_MONGODB: MONGODB = 'mongodb://127.0.0.1:27017/match',
    LIBRARY_BATCH = 8
  }
} = process

const PATTERN = '/**/*.{jpg,JPG,jpeg,JPEG}'
const BATCH = LIBRARY_BATCH ? Number(LIBRARY_BATCH) : NaN

const params = {
  from: FROM,
  to: TO,
  pattern: PATTERN,
  ...(isNaN(BATCH)) ? {} : { batch: BATCH }
}

log('🚀', params)
connnect(MONGODB)
  .then(() => ingest(params))
  .then(reportComplete)
  .catch(reportError)
  .finally(disconnnect)
