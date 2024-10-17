import { useContext } from 'react'
import { WalletContext } from './wallet.types'
import { useWalletStore } from '@/providers/wallet/wallet.store'
import { useWallets } from '@polkadot-onboard/react'

export const useJoystreamWallets = () => {
  const { wallets: allWallets } = useWallets()
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWalletsContext must be used within a WalletProvider')
  }
  const store = useWalletStore()
  return {
    ...store,
    ...context,
    allWallets,
  }
}
