import { GetUserChannelsQuery } from '@/gql/graphql'
import { useApiContext } from '@/providers/api'
import { useTransactionContext } from '@/providers/transaction'
import { FC } from 'react'
import { ApiPromise } from '@polkadot/api'
import { TRANSACTOR_MEMBER_ID } from '@/config'
import { Button } from './ui/button'

export const TransactorPermissions: FC<{
  channel: GetUserChannelsQuery['channels'][number] | null
}> = ({ channel }) => {
  const { api } = useApiContext()
  const { setTxForConfirmation } = useTransactionContext()

  if (!channel) return null

  const handleAddCollaborator = () => {
    if (!api) return

    const channelOwnerMemberId = channel.ownerMember!.id

    setTxForConfirmation(
      api.tx.content.updateChannel(
        { Member: channelOwnerMemberId },
        channel.id,
        {
          collaborators: createCollaboratorsMap(api, [
            ...channel.collaborators,
            {
              memberId: TRANSACTOR_MEMBER_ID,
              permissions: ['UpdateVideoMetadata', 'ManageVideoAssets'],
            },
          ]),
        }
      ),
      channel.ownerMember!.controllerAccount
    )
  }

  return (
    <div>
      <p>You need to add channel collaborator to Transcoder account.</p>
      <Button onClick={handleAddCollaborator}>Add collaborator</Button>
    </div>
  )
}
type Collaborator = {
  memberId: string
  permissions: string[]
}

function createCollaboratorsMap(
  api: ApiPromise,
  collaborators: Collaborator[]
) {
  return api.createType(
    'BTreeMap<u64, BTreeSet<PalletContentIterableEnumsChannelActionPermission>>',
    collaborators.reduce(
      (acc, collaborator) => {
        acc[collaborator.memberId] = api.createType(
          'BTreeSet<PalletContentIterableEnumsChannelActionPermission>',
          collaborator.permissions
        )
        return acc
      },
      {} as Record<string, any>
    )
  )
}
