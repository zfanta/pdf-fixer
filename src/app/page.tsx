'use client'

import { useCallback, useMemo, useState, ComponentProps } from 'react'
import SelectFile from '@/app/select-file'
import OffsetTable from '@/app/offset-table'
import dynamic from 'next/dynamic'
import Link from 'next/link'

function Home () {
  const [offsets, setOffsets] = useState<Array<{ start: number, end: number }>>()
  const [buffer, setBuffer] = useState<Uint8Array>(new Uint8Array())
  const worker = useMemo(() => new Worker(new URL('../worker.ts', import.meta.url)), [])

  const handleCompleted = useCallback<ComponentProps<typeof SelectFile>['onCompleted']>((buffer, offsets) => {
    setBuffer(buffer)

    if (offsets === undefined) return
    setOffsets(offsets)
  }, [])

  return (
    <main className="flex flex-col items-center justify-between p-24">
      <p>
        Fix a damaged PDF file. Try using <Link href="/corrupted.pdf">a corrupted PDF sample</Link>.
      </p>
      {offsets === undefined ? (
        <SelectFile worker={worker} onCompleted={handleCompleted} />
      ) : (
        <OffsetTable offsets={offsets} buffer={buffer} worker={worker} />
      )}
    </main>
  )
}

export default dynamic(async () => Home, {
  ssr: false
})
