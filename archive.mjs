#!/usr/bin/env node

import 'dotenv/config'
import debug from 'debug'
import {
  connect,
  disconnect
} from '#common'
import reportComplete from '#common/report-complete'
import reportError from '#common/report-error'
import cleanUp from './clean-up.mjs'

const log = debug('@sequencemedia/photography-library')

const {
  env: {
    LIBRARY_FROM: FROM = '/',
    LIBRARY_TO: TO,
    LIBRARY_MONGODB: MONGODB = 'mongodb://127.0.0.1:27017/photography-library'
  }
} = process

const params = {
  from: FROM,
  to: TO
}

log('🚀', params)
connect(MONGODB)
  .then(() => cleanUp(params))
  .then(reportComplete)
  .catch(reportError)
  .finally(disconnect)
