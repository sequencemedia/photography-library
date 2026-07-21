import debug from 'debug'

const error = debug('@sequencemedia/photography-library:error')

/**
 * @param {Error | unknown} e
 */
export default function reportError (e) {
  if (e instanceof Error) {
    error('code' in e ? `💥 ${e.code} - ${e.message}` : `💥 ${e.message}`)
  } else {
    error(`💥 ${e}`)
  }
}
