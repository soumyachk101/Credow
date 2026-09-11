import type algosdk from 'algosdk'

// OnCompletion values as returned by the indexer API.
const ON_COMPLETE_LABELS: Record<string, string> = {
  noop: 'NoOp (method call)',
  optin: 'OptIn',
  closeout: 'CloseOut',
  clear: 'ClearState',
  update: 'UpdateApplication',
  delete: 'DeleteApplication',
}

const SECURITY_CRITICAL = new Set(['update', 'delete'])

export function handleLifecycleEvent(tx: algosdk.indexerModels.Transaction, appId: bigint) {
  const onComplete = tx.applicationTransaction?.onCompletion ?? 'noop'
  const label = ON_COMPLETE_LABELS[onComplete] ?? `Unknown(${onComplete})`
  const sender = tx.sender
  const round = tx.confirmedRound

  const prefix = SECURITY_CRITICAL.has(onComplete) ? '[ALERT]' : '[INFO]'
  console.log(`${prefix} ${label} | app=${appId} sender=${sender} round=${round} txid=${tx.id}`)
}
