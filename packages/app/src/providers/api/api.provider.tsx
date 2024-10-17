import * as types from '@joystream/types'
import { ApiPromise, WsProvider } from '@polkadot/api'
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { RPC_URL } from '../../config'

type ApiContextType = {
  api: ApiPromise | null
  apiAt: (
    blockNumber: number
  ) => Promise<Awaited<ReturnType<ApiPromise['at']>> | null>
}
export const ApiContext = createContext<ApiContextType>({
  api: null,
  apiAt: async () => null,
})

export const ApiProvider: FC<PropsWithChildren> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise | null>(null)

  useEffect(() => {
    const setupApi = async () => {
      const provider = new WsProvider(RPC_URL, 500)
      const api = await ApiPromise.create({ provider })

      setApi(api)
    }

    setupApi()
  }, [])

  const apiAt = useCallback(
    async (blockNumber: number) => {
      if (!api) return null
      const hash = await api.rpc.chain.getBlockHash(blockNumber)
      return await api.at(hash)
    },
    [api]
  )

  return (
    <ApiContext.Provider value={{ api, apiAt }}>{children}</ApiContext.Provider>
  )
}

export const useApiContext = () => {
  const apiContext = useContext(ApiContext)

  if (apiContext === null) {
    throw new Error('useApiContext must be used within a ApiProvider')
  }

  return apiContext
}
