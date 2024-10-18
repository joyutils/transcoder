import { FC, useId, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { graphql } from '@/gql'
import { request } from 'graphql-request'
import { API_URL, QN_URL } from '@/config'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThumbnailCropDialog } from './ThumbnailCropDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useUploadedVideosStore } from '@/stores/uploadedVideosStore'
import { useJoystreamWallets } from '@/providers/wallet'
import { GetUserChannelsQuery } from '@/gql/graphql'
import { stringToU8a, u8aToHex } from '@polkadot/util'

const getChannelVideosQuery = graphql(`
  query GetChannelVideos($channelId: ID!) {
    videos(where: { channel: { id_eq: $channelId } }) {
      id
      title
      media {
        id
      }
      thumbnailPhoto {
        id
      }
    }
  }
`)

type VideoAssetUploadProps = {
  channel: GetUserChannelsQuery['channels'][0]
}

export const UploadAssetsTab: FC<VideoAssetUploadProps> = ({ channel }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const addUploadedVideoId = useUploadedVideosStore(
    (state) => state.addUploadedVideoId
  )

  const selectId = useId()

  const { wallet } = useJoystreamWallets()

  const {
    data: videosData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['channelVideos', channel.id],
    queryFn: () =>
      request(QN_URL, getChannelVideosQuery, { channelId: channel.id }),
    enabled: !!channel.id,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({
      videoId,
      channelId,
      thumbnailFile,
      videoFile,
      signature,
      timestamp,
    }: {
      videoId: string
      channelId: string
      thumbnailFile: File
      videoFile: File
      signature: string
      timestamp: number
    }) => {
      const formData = new FormData()
      formData.append('videoId', videoId)
      formData.append('channelId', channelId)
      formData.append('thumbnail', thumbnailFile)
      formData.append('media', videoFile)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp.toString())

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_URL}/video`)

      return new Promise<{ videoId: string }>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            setUploadProgress(percentComplete)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error'))
        }

        xhr.send(formData)
      })
    },
    onSuccess: (data: { videoId: string }) => {
      setUploadStatus(`Upload successful. Video ID: ${data.videoId}`)
      setUploadProgress(100)
      addUploadedVideoId(data.videoId)
    },
    onError: (error: Error) => {
      setUploadStatus(`Upload failed: ${error.message}`)
      setUploadProgress(0)
    },
  })

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setSelectedImageUrl(imageUrl)
      setCropDialogOpen(true)
    }
  }

  const handleCropComplete = ({ file, url }: { file: File; url: string }) => {
    setThumbnailFile(file)
    setCroppedImageUrl(url)
    setCropDialogOpen(false)
  }

  const handleCropCancel = () => {
    setCropDialogOpen(false)
    setSelectedImageUrl(null)
    setCroppedImageUrl(null)
    setThumbnailFile(null)
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!selectedVideoId || !thumbnailFile || !videoFile) {
      setUploadStatus('Please select both a video and thumbnail.')
      return
    }

    setUploadProgress(0)
    setUploadStatus('Waiting for signature...')

    try {
      const payload = {
        memberId: channel.ownerMember!.id,
        appName: 'Joyutils Transcoder',
        timestamp: Date.now(),
        action: 'uploadAssets',
        meta: {
          videoId: selectedVideoId,
        },
      }
      const signature = await wallet?.signer?.signRaw?.({
        address: channel.ownerMember!.controllerAccount!,
        data: u8aToHex(stringToU8a(JSON.stringify(payload))),
        type: 'payload',
      })

      if (!signature) {
        throw new Error('Failed to get signature')
      }

      setUploadStatus('Uploading...')

      uploadMutation.mutate({
        videoId: selectedVideoId,
        channelId: channel.id,
        thumbnailFile,
        videoFile,
        signature: signature.signature,
        timestamp: payload.timestamp,
      })
    } catch (error) {
      setUploadStatus(`Error signing transaction: ${(error as any).message}`)
      return
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading videos...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading videos. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={selectId}>Video</Label>
        <Select onValueChange={(value) => setSelectedVideoId(value)}>
          <SelectTrigger id={selectId}>
            <SelectValue placeholder="Select a video" />
          </SelectTrigger>
          <SelectContent>
            {videosData?.videos.map((video) => (
              <SelectItem key={video.id} value={video.id}>
                [{video.id}] {video.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVideoId && (
        <>
          <div>
            <Label htmlFor="thumbnail">Thumbnail</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
            />
            <div className="mt-2 w-[320px] h-[180px] bg-gray-100 rounded-md overflow-hidden">
              {croppedImageUrl ? (
                <img
                  src={croppedImageUrl}
                  alt="Cropped thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No thumbnail selected
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="video">Video File</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
            />
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">
              Before upload begins, you will be asked to sign a verification
              message. This is required to verify your ownership of the channel.
            </p>

            <Button onClick={handleSubmit} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload assets'}
            </Button>
          </div>

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500">
                Upload progress: {uploadProgress.toFixed(2)}%
              </p>
            </div>
          )}

          {uploadStatus && (
            <Alert>
              <AlertDescription>{uploadStatus}</AlertDescription>
            </Alert>
          )}

          {selectedImageUrl && (
            <ThumbnailCropDialog
              isOpen={cropDialogOpen}
              onCancel={handleCropCancel}
              imageUrl={selectedImageUrl}
              onCropComplete={handleCropComplete}
            />
          )}
        </>
      )}
    </div>
  )
}
