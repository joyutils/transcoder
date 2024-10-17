import { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'

type JobStatus = {
  id: string
  fileSize: number
  status: string
  createdAt: string
  updatedAt: string
}

type VideoStatus = {
  videoId: string
  thumbnail: JobStatus
  media: JobStatus
}

type JobStatusProps = {
  videoIds: string[]
}

const SingleVideoJobStatus: FC<{ videoId: string }> = ({ videoId }) => {
  const {
    data: videoStatus,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['videoStatus', videoId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/video/${videoId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch video status')
      }
      return response.json() as Promise<VideoStatus>
    },
    refetchInterval: (query) => {
      if (query.state.error) {
        return false
      }

      if (
        query.state.data?.thumbnail.status === 'completed' &&
        query.state.data?.media.status === 'completed'
      ) {
        return false
      }

      return 5000
    },
    retry: 2,
  })

  if (isError) {
    return (
      <Alert>
        <AlertDescription>
          Failed to fetch status for video {videoId}
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>
          Loading status for video {videoId}...
        </AlertDescription>
      </Alert>
    )
  }

  if (!videoStatus) {
    return null
  }

  const renderJobStatus = (job: JobStatus, jobType: string) => (
    <div className="mt-4">
      <h3 className="font-semibold">{jobType} Job Status:</h3>
      <p>Status: {job.status}</p>
      <p>File Size: {job.fileSize} bytes</p>
      <p>Created At: {new Date(job.createdAt).toLocaleString()}</p>
      <p>Updated At: {new Date(job.updatedAt).toLocaleString()}</p>
    </div>
  )

  return (
    <div className="border-b pb-4 mb-4">
      <h2 className="text-xl font-bold mb-4">
        Job Status for Video ID: {videoId}
      </h2>
      {renderJobStatus(videoStatus.thumbnail, 'Thumbnail')}
      {renderJobStatus(videoStatus.media, 'Media')}
    </div>
  )
}

export const JobStatusTab: FC<JobStatusProps> = ({ videoIds }) => {
  return (
    <div className="space-y-6">
      {videoIds.map((videoId) => (
        <SingleVideoJobStatus key={videoId} videoId={videoId} />
      ))}
    </div>
  )
}
