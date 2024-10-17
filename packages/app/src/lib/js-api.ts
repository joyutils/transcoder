import { TRANSACTOR_MEMBER_ID } from '@/config'
import { ContentMetadata, IVideoMetadata } from '@joystream/metadata-protobuf'
import { createType } from '@joystream/types'
import { ApiPromise } from '@polkadot/api'
import { Bytes, Option } from '@polkadot/types'

export const wrapMetadata = (metadata: Uint8Array): Option<Bytes> => {
  const metadataRaw = createType('Raw', metadata)
  const metadataBytes = createType('Bytes', metadataRaw)
  return createType('Option<Bytes>', metadataBytes)
}

type SetChannelCollaboratorInput = {
  channelId: string
  memberId: string
  existingCollaborators: {
    memberId: string
    permissions: string[]
  }[]
}

export async function prepareSetChannelCollaboratorTx(
  api: ApiPromise,
  input: SetChannelCollaboratorInput
) {
  const collaboratorsMap = input.existingCollaborators.reduce(
    (acc, collaborator) => {
      acc[parseInt(collaborator.memberId)] = collaborator.permissions
      return acc
    },
    {} as Record<number, string[]>
  )
  collaboratorsMap[TRANSACTOR_MEMBER_ID] = [
    'UpdateVideoMetadata',
    'ManageVideoAssets',
  ]
  const collaborators = createType(
    'Option<BTreeMap<u64, BTreeSet<PalletContentIterableEnumsChannelActionPermission>>>',
    collaboratorsMap
  )
  return api.tx.content.updateChannel(
    createType('PalletContentPermissionsContentActor', {
      Member: parseInt(input.memberId),
    }),
    input.channelId,
    createType('PalletContentChannelUpdateParametersRecord', {
      assetsToUpload: null,
      newMeta: null,
      assetsToRemove: [],
      collaborators,
      expectedDataObjectStateBloatBond: 0,
      storageBucketsNumWitness: null,
    })
  )
}

type CreateVideoInput = {
  title: string
  description?: string
  categoryId: string
  memberId: string
  channelId: string
}

export async function prepareCreateVideoTx(
  api: ApiPromise,
  input: CreateVideoInput
) {
  const properties: IVideoMetadata = {}
  properties.title = input.title
  if (input.description) {
    properties.description = input.description
  }
  properties.category = input.categoryId
  properties.license = {
    code: 1009,
  }
  properties.enableComments = true
  properties.isPublic = true
  properties.isExplicit = false
  properties.language = 'en'
  const rawMetadata = ContentMetadata.encode({
    videoMetadata: properties,
  }).finish()
  const metadata = wrapMetadata(rawMetadata)

  const [bagCreationPolicy, videoStateBloatBondValue] = await Promise.all([
    api.query.storage.dynamicBagCreationPolicies('Channel'),
    api.query.content.videoStateBloatBondValue(),
  ])

  const creationParameters = createType(
    'PalletContentVideoCreationParametersRecord',
    {
      meta: metadata,
      assets: null,
      autoIssueNft: null,
      storageBucketsNumWitness: bagCreationPolicy.numberOfStorageBuckets,
      expectedDataObjectStateBloatBond: 0,
      expectedVideoStateBloatBond: videoStateBloatBondValue,
    }
  )

  const actor = createType('PalletContentPermissionsContentActor', {
    Member: parseInt(input.memberId),
  })
  const tx = api.tx.content.createVideo(
    actor,
    input.channelId,
    creationParameters
  )

  return tx
}
