import { FC, useId } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from './ui/label'
import { useTransactionContext } from '@/providers/transaction'
import { useApiContext } from '@/providers/api'
import { prepareSetChannelCollaboratorTx } from '@/lib/js-api'
import { Button } from './ui/button'
import { GetUserChannelsQuery } from '@/gql/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

interface ChannelSelectProps {
  value: string | null
  onChange: (value: string) => void
  channels: GetUserChannelsQuery['channels']
  hasCollaborator: boolean
}

export const ChannelSelect: FC<ChannelSelectProps> = ({
  value,
  onChange,
  channels,
  hasCollaborator,
}) => {
  const selectId = useId()
  const { api } = useApiContext()
  const { setTxForConfirmation } = useTransactionContext()
  const queryClient = useQueryClient()

  const selectedChannel = channels.find((c) => c.id === value)

  if (!channels.length) {
    return <p>You don't have any channels. Please create a channel first.</p>
  }

  const handleAddCollaborator = async () => {
    if (!api || !value || !selectedChannel) return

    const tx = await prepareSetChannelCollaboratorTx(api, {
      channelId: value,
      memberId: selectedChannel.ownerMember!.id,
      existingCollaborators: selectedChannel.collaborators,
    })

    setTxForConfirmation(
      tx,
      selectedChannel.ownerMember!.controllerAccount,
      () => {
        console.log('invalidating')
        queryClient.invalidateQueries({ queryKey: ['channels'] })
      }
    )
  }

  function renderCollaboratorNode() {
    if (!value || hasCollaborator) {
      return null
    }

    return (
      <Alert className="mt-4">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Missing permissions</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            This channel does not have proper collaborator permissions set up.
            Please add the transcoder service transactor member as a channel
            collaborator to allow it to publish on-chain assets on your behalf.
          </p>
          <Button onClick={handleAddCollaborator}>Add collaborator</Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        <Label htmlFor={selectId}>Channel</Label>
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger className="w-full" id={selectId}>
            <SelectValue placeholder="Choose a channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                [{channel.id}] {channel.title ?? 'Untitled'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {renderCollaboratorNode()}
    </div>
  )
}
