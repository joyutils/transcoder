import { ApiProvider } from './providers/api'
import { WalletProvider } from './providers/wallet'
import { TopNav } from '@/components/TopNav'

import { Toaster } from '@/components/ui/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { FC } from 'react'
import { TransactionProvider } from '@/providers/transaction'
import { MainCard } from './components/MainCard'

const queryClient = new QueryClient()

const Layout: FC = () => (
  <>
    <TopNav />
    <div className="min-h-full">
      <main>
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8  mt-[50px]">
          <Outlet />
        </div>
      </main>
    </div>
  </>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <MainCard />,
      },
    ],
  },
])

const App = () => {
  return (
    <ApiProvider>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300}>
            <TransactionProvider>
              <RouterProvider router={router} />
              <Toaster />
            </TransactionProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ApiProvider>
  )
}

export default App
