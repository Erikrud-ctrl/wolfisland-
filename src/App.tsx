import { useEffect } from 'react'
import { useStore } from './store'
import { About, Bank, DrillPreview } from './ui/bank'
import { go, useRoute } from './ui/common'
import { ReviewView, RunView, SessionView } from './ui/session'
import { BlockView, Home, NewBlock, Prep, TeamSetup } from './ui/views'

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    go(to, true)
  }, [to])
  return null
}

export default function App() {
  const store = useStore()
  const route = useRoute()

  if (!store.state.team) return <TeamSetup store={store} first />

  const [a, b, c, d] = route
  if (a === 'lag') return <TeamSetup store={store} />
  if (a === 'om') return <About store={store} />
  if (a === 'ovningar') return b ? <DrillPreview key={b} store={store} id={b} /> : <Bank store={store} />
  if (a === 'block') {
    if (b === 'nytt') return <NewBlock store={store} />
    const block = store.state.blocks.find((x) => x.id === b)
    if (!block) return <Redirect to="" />
    if (c === undefined) return <BlockView store={store} block={block} />
    const index = Number(c)
    const stored = Number.isInteger(index) ? block.sessions[index] : undefined
    if (!stored) return <Redirect to={`block/${block.id}`} />
    if (d === 'infor') return <Prep key={`${block.id}-${index}`} store={store} block={block} index={index} />
    if (!stored.session) return <Redirect to={`block/${block.id}/${index}/infor`} />
    if (d === 'kor') return <RunView key={`${block.id}-${index}`} block={block} index={index} />
    if (d === 'klart') return <ReviewView store={store} block={block} index={index} />
    return <SessionView store={store} block={block} index={index} />
  }
  return <Home store={store} />
}
