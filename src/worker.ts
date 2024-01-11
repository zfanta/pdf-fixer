import createModule from '@zfanta/ghostscript-wasm'

let gs: Awaited<ReturnType<typeof createModule>>|undefined = undefined

const stdoutHandlers = new Set<Function>()
const stderrHandlers = new Set<Function>()

async function init () {
  if (gs !== undefined) {
    return gs
  }

  gs = await createModule({
    locateFile: () => new URL('@zfanta/ghostscript-wasm/dist/gs.wasm', import.meta.url).toString(),
    noInitialRun: true,
    noFSInit: true,
  })

  if (gs === undefined) {
    throw new Error('uninitialized gs instance')
  }

  let stdoutBuffer = ''
  let stderrBuffer = ''

  gs.FS.init(null, (stdout: number) => {
    if (stdout === 10) {
      stdoutHandlers.forEach(handler => handler(stdoutBuffer))
      stdoutBuffer = ''
      return
    }
    stdoutBuffer += String.fromCharCode(stdout)
  }, (stderr: number) => {
    if (stderr === 10) {
      stderrHandlers.forEach(handler => handler(stderrBuffer))
      stderrBuffer = ''
      return
    }
    stderrBuffer += String.fromCharCode(stderr)
  })

  return gs
}

export type WorkerInput = {
  method: 'getOffsets',
  payload: {
    buffer: Uint8Array
  }
} | {
  method: 'fixPdf',
  payload: {
    buffer: Uint8Array
    offset: number,
    length: number
  }
} | {
  method: 'init',
  payload: never
}

export type WorkerOutput = {
  method: 'getOffsets',
  payload: {
    progress: number,
    offsets: Array<{
      offset: number,
      lengths: number[]
    }> | undefined
  }
} | {
  method: 'fixPdf',
  payload: {
    numberOfPages: number | undefined,
    currentPage: number | undefined,
    buffer: Uint8Array | undefined
  }
} | {
  method: 'init',
  payload: never
}

async function getOffsets (buffer: Uint8Array) {
  // Find PDF header
  const signature = '%PDF-'
  const signatureEOF = '%%EOF'
  const offsets: Array<{
    offset: number,
    lengths: number[]
  }> = []

  let lastOffset = 0
  let lastProgress = 0
  while (true) {
    const currentOffset = buffer.indexOf(signature.charCodeAt(0), lastOffset)
    const progress = parseFloat((currentOffset / buffer.length).toFixed(2))
    if (progress !== lastProgress) {
      postMessage({
        method: 'getOffsets',
        payload: {
          progress: progress,
          offsets: undefined
        }
      } as WorkerOutput)
      lastProgress = progress
    }
    lastOffset = currentOffset + 1

    if (currentOffset === -1) break

    const str = buffer.slice(currentOffset, currentOffset + signature.length).reduce((acc, number) => `${acc}${String.fromCharCode(number)}`, '')
    if (str === signature) {
      const version = parseFloat(buffer.slice(currentOffset + signature.length, currentOffset + signature.length + 3).reduce((acc, number) => `${acc}${String.fromCharCode(number)}`, ''))
      if (!(isNaN(version) || Number.isInteger(version))) {
        offsets.push({
          offset: currentOffset,
          lengths: []
        })
      }
    } else if (str === signatureEOF) {
      offsets.forEach(offset => {
        offset.lengths.push(currentOffset + signatureEOF.length - offset.offset)
      })
    }
  }

  postMessage({
    method: 'getOffsets',
    payload: {
      progress: 1,
      offsets
    }
  } as WorkerOutput)
}

async function fixPdf (buffer: Uint8Array, offset: number, length: number) {
  const gs = await init()

  const inputPath = '/input.pdf'
  const outputPath = '/output.pdf'

  gs.FS.writeFile('/input.pdf', buffer.subarray(offset, offset + length))

  let pageCount = 0
  const pageCountHandler = (buffer: string) => {
    pageCount = parseInt(buffer)
    postMessage({
      method: 'fixPdf',
      payload: {
        numberOfPages: pageCount,
        buffer: undefined
      }
    } as WorkerOutput)
  }

  stdoutHandlers.add(pageCountHandler)
  gs.callMain(['-q', '-dNODISPLAY', `--permit-file-read=${inputPath}`, '-c', `(${inputPath}) (r) file runpdfbegin pdfpagecount = quit`])
  stdoutHandlers.delete(pageCountHandler)

  const progressHandler = (buffer: string) => {
    if (!buffer.startsWith('Page ')) {
      return
    }
    const currentPage = parseInt(buffer.replace(/^Page /, ''))
    postMessage({
      method: 'fixPdf',
      payload: {
        numberOfPages: pageCount,
        currentPage,
        buffer: undefined
      }
    } as WorkerOutput)
  }
  stdoutHandlers.add(progressHandler)
  gs.callMain(['-o', outputPath, '-sDEVICE=pdfwrite', '-dPDFSETTINGS=/prepress', inputPath])
  stdoutHandlers.delete(progressHandler)

  const outputBuffer = gs.FS.readFile(outputPath)
  postMessage({
    method: 'fixPdf',
    payload: {
      numberOfPages: pageCount,
      currentPage: pageCount,
      buffer: outputBuffer
    }
  } as WorkerOutput)
}

self.onmessage = async function (e) {
  const data = e.data as WorkerInput

  if (data.method === 'init') {
    await init()
    postMessage({
      method: 'init',
    } as WorkerOutput)
    return
  }

  if (data.method === 'getOffsets') {
    await getOffsets(data.payload.buffer)
    return
  }

  if (data.method === 'fixPdf') {
    const { payload } = data
    await fixPdf(payload.buffer, payload.offset, payload.length)
    return
  }
}
