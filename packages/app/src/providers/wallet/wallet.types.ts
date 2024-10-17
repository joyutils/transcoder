import { createContext } from 'react'
import { Account } from '@polkadot-onboard/core'

export const WalletContext = createContext<
  | undefined
  | {
      connectToWallet: (walletId: string) => Promise<Account[] | null>
      disconnectWallet: () => Promise<void>
    }
>(undefined)
