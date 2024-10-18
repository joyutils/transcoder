import { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { graphql } from '@/gql'
import { request } from 'graphql-request'
import { QN_URL, TRANSACTOR_MEMBER_ID } from '@/config'
import { useJoystreamWallets } from '@/providers/wallet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChannelSelect } from '@/components/ChannelSelect'
import { Loader2 } from 'lucide-react'
import { NewVideoTab } from './NewVideoTab'
import { UploadAssetsTab } from './UploadAssetsTab'
import { JobStatusTab } from './JobStatusTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUploadedVideosStore } from '@/stores/uploadedVideosStore'

const getUserChannelsQuery = graphql(`
  query GetUserChannels($userAccounts: [String!]!) {
    channels(where: { ownerMember: { controllerAccount_in: $userAccounts } }) {
      id
      title
      ownerMember {
        id
        controllerAccount
      }
      collaborators {
        permissions
        memberId
      }
    }
  }
`)

const fetchUserChannels = async (userAccounts: string[]) => {
  const data = await request(QN_URL, getUserChannelsQuery, { userAccounts })
  return data?.channels ?? []
}

export const MainCard: FC = () => {
  const [channelId, setChannelId] = useState<string | null>(null)
  const { walletAccounts, walletStatus } = useJoystreamWallets()
  const uploadedVideoIds = useUploadedVideosStore(
    (state) => state.uploadedVideoIds
  )

  const {
    data: channels,
    isLoading: isChannelsLoading,
    error: channelsError,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: () =>
      fetchUserChannels(walletAccounts.map((account) => account.address)),
    enabled: !!walletAccounts.length,
  })

  useEffect(() => {
    if (!channels?.length || channelId) return

    setChannelId(channels[0].id)
  }, [channels])

  const channel = channels?.find((c) => c.id === channelId)
  const channelCollaborator = channel?.collaborators.find(
    (c) => c.memberId === TRANSACTOR_MEMBER_ID.toString()
  )
  const hasTransactorPermission =
    channelCollaborator?.permissions.includes('UpdateVideoMetadata') &&
    channelCollaborator?.permissions.includes('ManageVideoAssets')

  const getCardContent = () => {
    if (!walletAccounts.length) {
      return <p className="text-red-500">Please connect your wallet first.</p>
    }

    const isLoading = isChannelsLoading || walletStatus === 'pending'

    if (isLoading) {
      return (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> <p>Loading...</p>
        </div>
      )
    }

    if (channelsError) {
      return (
        <p className="text-red-500">
          Error loading channels. Please try again.
        </p>
      )
    }

    const getChannelContent = () => {
      if (!channel || !hasTransactorPermission) {
        return null
      }

      return (
        <Tabs defaultValue="new-video" className="w-full">
          <TabsList>
            <TabsTrigger value="new-video">New video</TabsTrigger>
            <TabsTrigger value="upload-assets">Upload assets</TabsTrigger>
            <TabsTrigger value="job-status">Job status</TabsTrigger>
          </TabsList>
          <TabsContent value="new-video">
            <NewVideoTab channel={channel} />
          </TabsContent>
          <TabsContent value="upload-assets">
            <UploadAssetsTab channel={channel} />
          </TabsContent>
          <TabsContent value="job-status">
            {uploadedVideoIds.length > 0 ? (
              <JobStatusTab videoIds={uploadedVideoIds} />
            ) : (
              <p>Please upload a video first to see job status.</p>
            )}
          </TabsContent>
        </Tabs>
      )
    }

    return (
      <div className="space-y-6">
        <ChannelSelect
          value={channelId}
          hasCollaborator={!!channelCollaborator}
          onChange={setChannelId}
          channels={channels || []}
        />
        {getChannelContent()}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcode videos</CardTitle>
      </CardHeader>
      <CardContent>{getCardContent()}</CardContent>
    </Card>
  )
}
