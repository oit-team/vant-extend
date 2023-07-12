import { Uploader } from 'vant'

const STATUS = {
  UPLOADING: 'uploading',
  FAILED: 'failed',
  DONE: 'done',
}

export default {
  name: 'VcUpload',

  inheritAttrs: false,

  model: {
    prop: 'fileList',
  },

  props: {
    data: {
      type: Object,
      default: () => ({}),
    },
    action: {
      type: String,
      required: true,
    },
    headers: [Object, Function],
    // 分块上传，每块的大小限制，<=0则不分块，单位：kb
    chunkSize: Number,
    transformData: {
      type: Function,
      required: true,
    },
    handleResponse: Function,
    fileList: Array,
  },

  computed: {
    // 是否是分块上传
    isChunked() {
      return this.chunkSize > 0
    },
  },

  created() {
    this.abortable = new WeakMap()
  },

  methods: {
    /**
     * 取消请求
     * @public
     */
    abort(file) {
      this.abortable.get(file)?.()
    },
    onAfterRead(option) {
      Array.isArray(option) ? option.forEach(this.startUpload) : this.startUpload(option)
    },
    onClickPreview(item) {
      this.$emit('click-preview', item)

      // 重试
      if (item.status === STATUS.FAILED) this.onAfterRead(item)
    },
    startUpload(option) {
      option.status = STATUS.UPLOADING
      option.message = '上传中...'

      if (this.isChunked) {
        this.uploadChunkFile(option)
      } else {
        this.uploadFile(option)
      }
    },
    uploadFile(option) {
      const rawFile = option.file

      const { request, abort } = this.post({
        file: rawFile,
      })
      this.abortable.set(rawFile, abort)

      request
        .then(() => {
          option.status = STATUS.DONE
          option.message = '上传成功'
        })
        .catch((e) => {
          console.error(e)
          option.status = STATUS.FAILED
          option.message = '上传失败'
          if (e.name === 'AbortError') {
            const index = this.fileList.findIndex(item => item.file === rawFile)
            if (~index) {
              this.fileList.splice(index, 1)
              this.$emit('input', this.fileList)
            }
          }
        })
        .finally(() => {
          this.abortable.delete(rawFile)
        })
    },
    async uploadChunkFile(option) {
      const rawFile = option.file

      const chunkSize = this.chunkSize * 1024
      const chunkTotal = chunkSize > 0 ? Math.ceil(rawFile.size / chunkSize) : 1

      for (let i = 0; i < chunkTotal; i++) {
        try {
          const chunkStart = i * chunkSize
          const chunkEnd = Math.min(rawFile.size, chunkStart + chunkSize)
          const fileChunk = rawFile.slice(chunkStart, chunkEnd)

          const { request, abort } = this.post({
            file: rawFile,
            fileChunk,
            chunkSize,
            chunkStart,
            chunkEnd,
          })
          this.abortable.set(rawFile, abort)

          let response = await request
          if (typeof this.handleResponse === 'function') {
            response = await this.handleResponse(response, option)
          }

          if (chunkEnd >= rawFile.size) {
            option.status = STATUS.DONE
            option.message = '上传成功'
            this.$emit('success', {
              item: option,
              response,
            })
          }
        } catch (e) {
          console.error(e)
          option.status = STATUS.FAILED
          option.message = '上传失败'
          this.$emit('error', {
            item: option,
            error: e,
          })
          // 跳出循环
          break
        } finally {
          this.abortable.delete(rawFile)
        }
      }
    },
    post(option) {
      const result = this.transformData(this.data, option)
      const formData = new FormData()
      Object
        .entries(result)
        .forEach(([key, value]) => formData.append(key, value))

      const headers = typeof this.headers === 'function' ? this.headers() : this.headers

      const controller = new AbortController()
      const signal = controller.signal

      const request = fetch(this.action, {
        method: 'POST',
        body: formData,
        headers,
        signal,
      })
        .then(response => {
          if (response.ok) return response.json()
          return Promise.reject(response)
        })

      return {
        request,
        abort: () => controller.abort(),
      }
    },
  },

  render(h) {
    /**
     * FIXME:
     * 报错 $attrs $listeners is readonly
     */
    return h(Uploader, {
      attrs: {
        multiple: this.$attrs.multiple,
      },
      props: {
        ...this.$attrs,
        fileList: this.fileList,
        afterRead: this.onAfterRead,
      },
      on: {
        ...this.$listeners,
        'click-preview': this.onClickPreview,
      },
    })
  },
}
