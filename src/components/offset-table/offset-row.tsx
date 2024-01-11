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
  const [pdfLink, setPdfLink] = useState<string | undefined>(undefined)

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
        setPdfLink(URL.createObjectURL(blob))
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

  return (
    <tr>
      <td className={cellStyle}>{convertNumberToHexString(offset)}</td>
      <td className={cellStyle}>{convertSizeToHumanReadable(length)}</td>
      <td className={cellStyle}>
        {numberOfPages === undefined && (
          <button onClick={handleClickFix} disabled={disabled}>
            Fix
          </button>
        )}
        {pdfLink !== undefined && (
          <a href={pdfLink} target="_blank">
            Download
          </a>
        )}
        {numberOfPages !== undefined && currentPage !== undefined && pdfLink === undefined && (
          <div>
            {currentPage} / {numberOfPages}
          </div>
        )}
      </td>
    </tr>
  )
}
