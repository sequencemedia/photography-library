import type { Stats } from 'node:fs'
import type { ObjectId } from 'mongoose'

declare global {
  type FSStatsType = Pick<Stats, 'atime' | 'mtime' | 'ctime' | 'birthtime' | 'atimeMs' | 'mtimeMs' | 'ctimeMs' | 'birthtimeMs' | 'size'>

  namespace PhotographyLibraryTypes {
    export interface RecordFilterType {
      filePath: string
    }

    export interface RecordUpdateType extends FSStatsType {
      hash: string
    }

    export interface WriteItemType {
      filter: RecordFilterType
      update: RecordUpdateType
    }

    export interface RecordType extends FSStatsType {
      id: ObjectId
      filePath: string
      hash: string
    }
  }
}

export {}
