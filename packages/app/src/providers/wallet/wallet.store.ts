import { create } from 'zustand'
import { Account, BaseWallet } from '@polkadot-onboard/core'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type WalletStatus = 'unknown' | 'connected' | 'disconnected' | 'pending'

export type WalletStoreState = {
  wallet: BaseWallet | null
  walletAccounts: Account[]
  walletStatus: WalletStatus
  lastUsedWalletName: string | null
}

export type WalletStoreActions = {
  setWallet: (wallet: BaseWallet | null) => void
  setWalletAccounts: (accounts: Account[]) => void
  setWalletStatus: (status: WalletStatus) => void
}

export const useWalletStore = create<WalletStoreState & WalletStoreActions>()(
  persist(
    immer((set) => ({
      wallet: null,
      walletAccounts: [],
      walletStatus: 'unknown',
      lastUsedWalletName: null,
      setWallet: (wallet) => {
        set((state) => {
          state.wallet = wallet
          state.lastUsedWalletName = wallet?.metadata.id || null
        })
      },
      setWalletAccounts: (accounts) => {
        set((state) => {
          state.walletAccounts = accounts
        })
      },
      setWalletStatus: (status) => {
        set((state) => {
          state.walletStatus = status
        })
      },
    })),
    {
      name: 'joyutils-wallet',
      partialize: (s) => ({
        lastUsedWalletName: s.lastUsedWalletName,
      }),
    }
  )
)
