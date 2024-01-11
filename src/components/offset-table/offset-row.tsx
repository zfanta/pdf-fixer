import {useCallback, useState} from "react";
import {WorkerInput, WorkerOutput} from "@/worker";

const cellStyle = 'border-solid p-2'

function convertNumberToHexString (number: number) {
  return '0x' + number.toString(16).padStart(8, '0')
}

function convertSizeToHumanReadable (size: number) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let i = 0

  while (size >= 1024) {
    size /= 1024
    i++
  }

  return `${size.toFixed(2)} ${units[i]}`
}

interface OffsetRowProps {
  worker: Worker
  buffer: Uint8Array
  offset: number
  length: number
  disabled: boolean
  onStart: () => void
  onEnd: () => void
}

export default function OffsetRow ({ offset, length, buffer, worker, disabled, onEnd, onStart }: OffsetRowProps) {
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined)
  const [numberOfPages, setNumberOfPages] = useState<number | undefined>(undefined)
  const [fixedPdfLink, setFixedPdfLink] = useState<string | undefined>(undefined)
  const [rawPdfLink, setRawPdfLink] = useState<string | undefined>(undefined)

  const handleClickFix = useCallback(() => {
    onStart()

    worker.onmessage = (e) => {
      const { method, payload } = e.data as WorkerOutput

      if (method !== 'fixPdf') return

      const { buffer, numberOfPages, currentPage } = payload

      if (numberOfPages !== undefined) setNumberOfPages(numberOfPages)
      if (currentPage !== undefined) setCurrentPage(currentPage)
      if (buffer !== undefined) {
        const blob = new Blob([buffer], { type: 'application/pdf' })
        setFixedPdfLink(URL.createObjectURL(blob))
        onEnd()
      }
    }

    worker.postMessage({
      method: 'fixPdf',
      payload: {
        buffer,
        offset,
        length
      }
    } as WorkerInput)
  }, [buffer, length, offset, onEnd, onStart, worker])

  const loadRawPdf = useCallback(() => {
    const blob = new Blob([buffer.subarray(offset, length)], { type: 'application/pdf' })
    setRawPdfLink(URL.createObjectURL(blob))
  }, [buffer, length, offset])

  return (
    <tr>
      <td className={cellStyle}>{convertNumberToHexString(offset)}</td>
      <td className={cellStyle} title={`${length}`}>{convertSizeToHumanReadable(length)}</td>
      <td className={cellStyle}>
        {numberOfPages === undefined && (
          <button onClick={handleClickFix} disabled={disabled}>
            Fix
          </button>
        )}
        {fixedPdfLink !== undefined && (
          <a href={fixedPdfLink} target="_blank">
            Download fixed
          </a>
        )}
        {numberOfPages !== undefined && currentPage !== undefined && fixedPdfLink === undefined && (
          <div>
            {currentPage} / {numberOfPages}
          </div>
        )}
      </td>
      <td className={cellStyle}>
        {rawPdfLink === undefined && (
          <button onClick={loadRawPdf}>
            Load raw pdf
          </button>
        )}
        {rawPdfLink !== undefined && (
          <a href={rawPdfLink} target="_blank">
            Download raw pdf
          </a>
        )}
      </td>
    </tr>
  )
}
