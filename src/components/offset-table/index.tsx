import { useCallback, useState } from 'react'
import OffsetRow from "@/components/offset-table/offset-row"

const cellStyle = 'border-solid p-2'

interface OffsetTableProps {
  worker: Worker
  buffer: Uint8Array
  offsets: Array<{ offset: number, length: number }>
}

export default function OffsetTable ({ offsets, buffer, worker }: OffsetTableProps) {
  const [inProgress, setInProgress] = useState(false)

  const handleStart = useCallback(() => {
    setInProgress(true)
  }, [])
  const handleEnd = useCallback(() => {
    setInProgress(false)
  }, [])

  return (
    <table className="border-collapse">
      <thead>
      <tr>
        <th className={cellStyle}>Start</th>
        <th className={cellStyle}>Length</th>
        <th className={cellStyle}>Fix</th>
        <th className={cellStyle}>Download</th>
      </tr>
      </thead>
      <tbody>
      {offsets.map((offset) => (
        <OffsetRow
          key={`${offset.offset}-${offset.length}`}
          worker={worker}
          buffer={buffer}
          offset={offset.offset}
          length={offset.length}
          disabled={inProgress}
          onStart={handleStart}
          onEnd={handleEnd}
        />
      ))}
      </tbody>
    </table>
  )
}
