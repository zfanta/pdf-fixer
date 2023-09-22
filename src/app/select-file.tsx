import { ChangeEventHandler, FormEventHandler, useCallback, useState } from 'react'
import { WorkerInput, WorkerOutput } from '@/worker'

interface SelectFileProps {
  worker: Worker
  onCompleted: (buffer: Uint8Array, offsets: Array<{ start: number, end: number }>) => void
}

export default function SelectFile ({ worker, onCompleted }: SelectFileProps) {
  const [progress, setProgress] = useState<number>(0)
  const [file, setFile] = useState<File | undefined>(undefined)

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    if (e.target.files === null) return
    setFile(e.target.files[0])
  }, [])

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(async (e) => {
    e.preventDefault()

    if (file === undefined) {
      alert('Please select file')
      return
    }

    const buffer = new Uint8Array(await file.arrayBuffer())

    worker.onmessage = (e) => {
      const { method, payload } = e.data as WorkerOutput

      if (method !== 'getOffsets') return

      const { offsets, progress } = payload
      if (offsets !== undefined) {
        const flat = offsets.reduce((acc, cur) => {
          const offsetsFlat = cur.ends.map((end) => ({
            start: cur.start,
            end
          }))
          return [...acc, ...offsetsFlat]
        }, [] as { start: number, end: number }[])

        onCompleted(buffer, flat)
      }
      if (progress !== undefined) setProgress(progress)
    }

    worker.postMessage({
      method: 'getOffsets',
      payload: {
        buffer
      }
    } as WorkerInput)
  }, [file, onCompleted, worker])

  return (
    <div>
      {progress === 0 ? (
        <form onSubmit={handleSubmit}>
          <input type="file" onChange={handleChange} />
          <input type="submit" />
        </form>
      ) : (
        <div>
          {parseInt(`${progress * 100}`)}%
        </div>
      )}
    </div>
  )
}
