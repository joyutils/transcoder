import { createContext } from 'react'
import { SubmittableExtrinsic } from '@polkadot/api/types'

export enum ExtrinsicStatus {
  Unsigned,
  Signed,
  Finalizing,
  Syncing,
  Completed,
  Error,
}
export type ExtrinsicStatusCallbackFn = (status: ExtrinsicStatus) => void

export type TransactionContextType = {
  setTxForConfirmation: (
    tx: SubmittableExtrinsic<'promise'>,
    accountId: string,
    onSuccess?: () => void
  ) => void
}

export const TransactionContext = createContext<TransactionContextType>({
  setTxForConfirmation: () => {},
})

export type RawExtrinsicResult = {
  events: string[]
  blockHash: string
  transactionHash: string
}
