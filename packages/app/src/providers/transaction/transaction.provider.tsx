import { FC, PropsWithChildren, useCallback, useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Registry } from '@polkadot/types/types'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { CircleCheck, CircleX, Loader2 } from 'lucide-react'

import { print } from 'graphql'
import {
  ExtrinsicStatus,
  ExtrinsicStatusCallbackFn,
  RawExtrinsicResult,
  TransactionContext,
} from './transaction.types'
import { useWalletStore } from '@/providers/wallet/wallet.store'
import { TransactionDetail } from '@/components/TransactionDetail'
import {
  DispatchError,
  EventRecord,
  Event,
} from '@polkadot/types/interfaces/system'
import { useApiContext } from '../api'
import { graphql } from '@/gql'
import { QN_WS_URL } from '@/config'
import { SubscriptionClient } from 'subscriptions-transport-ws'

const getQnStateSubscription = graphql(`
  subscription GetQnState {
    stateSubscription {
      lastCompleteBlock
    }
  }
`)

const wsClient = new SubscriptionClient(QN_WS_URL, {})

export const TransactionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [transaction, setTransaction] =
    useState<SubmittableExtrinsic<'promise'> | null>(null)
  const [transactionStatus, setTransactionStatus] =
    useState<ExtrinsicStatus | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null)
  const [result, setResult] = useState<
    (RawExtrinsicResult & { blockNumber: number }) | null
  >(null)
  const [error, setError] = useState<Error | null>(null)
  const { api } = useApiContext()
  const setTxForConfirmation = useCallback(
    async (
      tx: SubmittableExtrinsic<'promise'>,
      accountId: string,
      onSuccess?: () => void
    ) => {
      setTransaction(tx)
      setAccountId(accountId)
      if (onSuccess) {
        setOnSuccess(() => onSuccess)
      }
    },
    []
  )

  const handleClose = () => {
    setTransaction(null)
    setTransactionStatus(null)
    setAccountId(null)
    setResult(null)
    setOnSuccess(null)
    setError(null)
  }

  const handleContinue = async () => {
    if (!transaction || !accountId || !api) {
      return
    }

    setTransactionStatus(ExtrinsicStatus.Unsigned)
    setError(null)

    try {
      const result = await sendExtrinsic(
        transaction,
        accountId,
        api.registry,
        (status) => {
          setTransactionStatus(status)
        }
      )

      const blockHeader = await api.rpc.chain.getHeader(result.blockHash)
      setResult({ ...result, blockNumber: blockHeader.number.toNumber() })
      if (result.events.includes('system.ExtrinsicFailed')) {
        setTransactionStatus(ExtrinsicStatus.Error)
        setError(new Error('ExtrinsicFailed'))
      } else {
        setTransactionStatus(ExtrinsicStatus.Syncing)
      }
    } catch (error) {
      console.error('Error sending extrinsic:', error)
      setTransactionStatus(ExtrinsicStatus.Error)
      setError(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  const isProcessing = [
    ExtrinsicStatus.Signed,
    ExtrinsicStatus.Finalizing,
    ExtrinsicStatus.Syncing,
  ].includes(transactionStatus as ExtrinsicStatus)

  const canSign =
    !transactionStatus || transactionStatus === ExtrinsicStatus.Error

  const renderTransactionStatus = () => {
    if (transactionStatus === ExtrinsicStatus.Signed) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing transaction...</span>
        </div>
      )
    }

    if (transactionStatus === ExtrinsicStatus.Finalizing) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Finalizing transaction...</span>
        </div>
      )
    }

    if (transactionStatus === ExtrinsicStatus.Syncing) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Waitng for QN synch...</span>
        </div>
      )
    }

    if (transactionStatus === ExtrinsicStatus.Completed) {
      return (
        <div className="text-green-600">
          <h3 className="flex gap-2 items-center">
            <CircleCheck className="w-5 h-5" /> Success
          </h3>
          <a
            href={`https://joystream.subscan.io/extrinsic/${result?.transactionHash}`}
            target="_blank"
            rel="noreferrer"
            className="block text-blue-600 underline mt-1"
          >
            View on Subscan
          </a>
        </div>
      )
    }

    if (transactionStatus === ExtrinsicStatus.Error) {
      return (
        <div className="text-red-600">
          <h3 className="flex gap-2 items-center">
            <CircleX className="w-5 h-5" /> Failed
          </h3>
          <p>Error: {error?.message || 'Unknown error'}</p>
        </div>
      )
    }

    return <div>Waiting for signature...</div>
  }

  useEffect(() => {
    if (!result?.blockNumber || transactionStatus !== ExtrinsicStatus.Syncing) {
      return
    }

    const subscription = wsClient.request({
      query: print(getQnStateSubscription),
    })

    const { unsubscribe } = subscription.subscribe({
      next: (data) => {
        const lastCompleteBlock = (data?.data?.stateSubscription as any)
          ?.lastCompleteBlock as number | undefined

        if (lastCompleteBlock && lastCompleteBlock >= result.blockNumber) {
          unsubscribe()
          setTimeout(() => {
            setTransactionStatus(ExtrinsicStatus.Completed)
            onSuccess?.()
          }, 1500)
        }
      },
      error: (error) => {
        console.error('Error subscribing to QN state:', error)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [result?.blockNumber, transactionStatus, onSuccess])

  return (
    <TransactionContext.Provider value={{ setTxForConfirmation }}>
      <AlertDialog open={!!transaction}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              Confirm transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm the transaction details below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-6">
            <TransactionDetail
              label="Method"
              value={`${transaction?.method.section}.${transaction?.method.method}`}
            />
            <TransactionDetail
              label="Arguments"
              value={
                <pre className="h-40 overflow-y-auto p-2 bg-gray-50 rounded border text-sm">
                  {JSON.stringify(
                    // @ts-ignore
                    transaction?.method.toHuman()?.args,
                    null,
                    2
                  )}
                </pre>
              }
            />
            <TransactionDetail
              label="Status"
              value={renderTransactionStatus()}
            />
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel onClick={handleClose} disabled={isProcessing}>
              {!transactionStatus || transactionStatus === ExtrinsicStatus.Error
                ? 'Cancel'
                : 'Close'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinue} disabled={!canSign}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                'Sign'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {children}
    </TransactionContext.Provider>
  )
}

function sendExtrinsic(
  tx: SubmittableExtrinsic<'promise'>,
  accountId: string,
  registry: Registry,
  cb?: ExtrinsicStatusCallbackFn
) {
  const signer = useWalletStore.getState().wallet?.signer
  return new Promise<RawExtrinsicResult>((resolve, reject) => {
    let unsub: () => void

    tx.signAndSend(accountId, { nonce: -1, signer }, (result) => {
      const extrinsicsHash = tx.hash.toHex()
      const { status, isError, events: rawEvents, dispatchError } = result
      if (isError) {
        unsub()
        const errorName = extractErrorName(dispatchError)
        const blockExplorerLink = `https://joystream.subscan.io/extrinsic/${extrinsicsHash}`
        reject(new Error(`${errorName}\nBlock Explorer: ${blockExplorerLink}`))
        return
      }

      if (status.isInBlock) {
        try {
          // parse events to exit early if there's an error
          parseExtrinsicEvents(registry, rawEvents)
          cb?.(ExtrinsicStatus.Finalizing)
        } catch (error) {
          unsub()
          reject(error)
          return
        }
      } else if (status.isFinalized) {
        unsub()
        try {
          const events = parseExtrinsicEvents(registry, rawEvents)
          resolve({
            events: events.map((event) => `${event.section}.${event.method}`),
            blockHash: status.asFinalized.toString(),
            transactionHash: extrinsicsHash,
          })
        } catch (error) {
          unsub()
          reject(error)
          return
        }
      }
    })
      .then((unsubFn) => {
        cb?.(ExtrinsicStatus.Signed)
        unsub = unsubFn
      })
      .catch((e) => {
        reject(e)
      })
  })
}

const parseExtrinsicEvents = (
  registry: Registry,
  eventRecords: EventRecord[]
): Event[] => {
  const events = eventRecords.map((record) => record.event)
  const systemEvents = events.filter((event) => event.section === 'system')

  for (const event of systemEvents) {
    if (event.method === 'ExtrinsicFailed') {
      const errorMsg = extractErrorName(event.data[0] as DispatchError)

      throw new Error(errorMsg)
    } else if (
      event.method === 'ExtrinsicSuccess' ||
      event.method === 'NewAccount'
    ) {
      return events
    } else {
      console.warn('Unknown extrinsic event', {
        event: { method: event.method },
      })
    }
  }

  throw new Error("Finalized extrinsic didn't fail or succeed")
}

function extractErrorName(dispatchError?: DispatchError): string {
  if (!dispatchError) return 'UnknownError'

  if (dispatchError.isModule) {
    const moduleError = dispatchError.asModule
    const { registry } = dispatchError
    const metaError = registry.findMetaError(moduleError)
    return metaError.name
  } else if (dispatchError.isToken) {
    return `Token: ${dispatchError.asToken.type}`
  } else if (dispatchError.isArithmetic) {
    return `Arithmetic: ${dispatchError.asArithmetic.type}`
  }

  return dispatchError.toString()
}
