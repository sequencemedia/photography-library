import type { ObjectId } from 'mongoose'

declare global {
  namespace PhotographyLibraryTypes {
    export interface IngestFilterType {
      filePath: string
    }

    export interface IngestUpdateType {
      atime: Date
      mtime: Date
      ctime: Date
      birthtime: Date
      atimeMs: number
      mtimeMs: number
      ctimeMs: number
      birthtimeMs: number
      size: number
    }

    export interface IngestItemType {
      filter: IngestFilterType
      update: IngestUpdateType
    }

    export interface RecordType {
      id: ObjectId
      filePath: string
      atime: Date
      mtime: Date
      ctime: Date
      birthtime: Date
      atimeMs: number
      mtimeMs: number
      ctimeMs: number
      birthtimeMs: number
      size: number
      hash: string
    }

    export type RecordFilterType = IngestFilterType

    export interface RecordUpdateType extends IngestUpdateType {
      hash: string
    }

    export interface RecordItemType {
      filter: RecordFilterType
      update: RecordUpdateType
      upsert: boolean
    }
  }
}

export {}
