import Vue from 'vue'

export default {
  transformData(data, option) {
    const fileType = [/image/, /video/].findIndex(type => type.test(option.file.type))

    if (option.fileChunk) {
      const {
        fileChunk,
        chunkStart,
        chunkEnd,
        file,
      } = option

      return {
        ...data,
        userId: 0,
        noThumb: '0',
        totalSize: file.size,
        startPos: chunkStart,
        endPos: chunkEnd,
        fname: file.name,
        fileType,
        file: fileChunk,
      }
    } else {
      return {
        ...data,
        file: option.file,
        fileType,
      }
    }
  },
  handleResponse(e) {
    if (e.status !== 101 && e.status !== 0) return Promise.reject(e)
    return e
  },
  onSuccess({ item, response }) {
    Vue.set(item, 'response', response)
  },
}
