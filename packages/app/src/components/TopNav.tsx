import { FC } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useJoystreamWallets } from '@/providers/wallet'
import { NavLink } from 'react-router-dom'

export const TopNav: FC = () => {
  const {
    connectToWallet,
    disconnectWallet,
    allWallets,
    walletStatus,
    wallet,
  } = useJoystreamWallets()

  const handleConnectWallet = async () => {
    try {
      const walletId = allWallets?.[0]?.metadata.id
      if (walletId) {
        const accounts = await connectToWallet(walletId)
        toast.success(`Wallet connected with ${accounts?.length} accounts`)
      } else {
        toast.error('No wallet available')
      }
    } catch (error) {
      toast.error('Failed to connect wallet')
    }
  }

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet()
      toast.success('Wallet disconnected')
    } catch (error) {
      toast.error('Failed to disconnect wallet')
    }
  }

  const walletButton =
    walletStatus === 'connected' ? (
      <Button onClick={handleDisconnectWallet}>
        Disconnect {wallet?.metadata.title}
      </Button>
    ) : walletStatus === 'pending' ? (
      <Button disabled>Connecting...</Button>
    ) : (
      <Button onClick={handleConnectWallet}>Connect Wallet</Button>
    )

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Transcoder</h1>
            <NavLink
              to="/"
              className="ml-4 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
            >
              Home
            </NavLink>
          </div>
          <div>{walletButton}</div>
        </div>
      </div>
    </nav>
  )
}
