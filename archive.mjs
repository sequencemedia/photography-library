#!/usr/bin/env node

import 'dotenv/config'
import debug from 'debug'
import {
  connnect,
  disconnnect
} from '#common'
import reportComplete from '#common/report-complete'
import reportError from '#common/report-error'
import cleanUp from './clean-up.mjs'

const log = debug('@sequencemedia/photography-library')

const {
  env: {
    LIBRARY_FROM: FROM = '/',
    LIBRARY_TO: TO,
    LIBRARY_MONGODB: MONGODB = 'mongodb://127.0.0.1:27017/match'
  }
} = process

const params = {
  from: FROM,
  to: TO
}

log('🚀', params)
connnect(MONGODB)
  .then(() => cleanUp(params))
  .then(reportComplete)
  .catch(reportError)
  .finally(disconnnect)
