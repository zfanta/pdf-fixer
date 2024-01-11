'use client'

import { useCallback, useMemo, useState, ComponentProps, useEffect } from 'react'
import SelectFile from '@/components/select-file'
import OffsetTable from '@/components/offset-table'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { WorkerInput } from '@/worker'
import { match, P } from 'ts-pattern'

function Home () {
  const [offsets, setOffsets] = useState<Array<{ offset: number, length: number }>>()
  const [buffer, setBuffer] = useState<Uint8Array>(new Uint8Array())
  const worker = useMemo(() => new Worker(new URL('../worker.ts', import.meta.url)), [])
  const [loading, setLoading] = useState(true)

  const handleCompleted = useCallback<ComponentProps<typeof SelectFile>['onCompleted']>((buffer, offsets) => {
    setBuffer(buffer)

    if (offsets === undefined) return
    setOffsets(offsets)
  }, [])

  useEffect(() => {
    if (!loading) return

    worker.onmessage = () => {
      setLoading(false)
    }

    worker.postMessage({
      method: 'init',
    } as WorkerInput)
  }, [loading, worker])

  return (
    <main className="flex flex-col items-center justify-between p-24">
      <p>
        Fix a damaged PDF file. Try using <Link prefetch={false} target="_blank" href="/corrupted.pdf">a corrupted PDF sample</Link>.
      </p>
      <p>
        The file is not processed on the server. Processing is entirely handled on the client side. Even if you disconnect from the internet, it will continue to function.
      </p>
      {match({ loading, offsets })
        .with({ loading: true }, () => <>Loading...</>)
        .with({ offsets: undefined }, () => <SelectFile worker={worker} onCompleted={handleCompleted} />)
        .with({ offsets: P.array() }, ({ offsets }) => <OffsetTable worker={worker} buffer={buffer} offsets={offsets} />)
        .otherwise(() => <p>Something went wrong.</p>)
      }
    </main>
  )
}

export default dynamic(async () => Home, {
  ssr: false
})
