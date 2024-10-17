import { useContext } from 'react'
import { TransactionContext } from './transaction.types'

export const useTransactionContext = () => {
  const transactionContext = useContext(TransactionContext)

  if (transactionContext === null) {
    throw new Error(
      'useTransactionContext must be used within a TransactionProvider'
    )
  }

  return transactionContext
}
