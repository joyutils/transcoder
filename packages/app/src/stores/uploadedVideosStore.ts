import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UploadedVideosState {
  uploadedVideoIds: string[]
  addUploadedVideoId: (videoId: string) => void
}

export const useUploadedVideosStore = create<UploadedVideosState>()(
  persist(
    (set) => ({
      uploadedVideoIds: [],
      addUploadedVideoId: (videoId) =>
        set((state) => ({
          uploadedVideoIds: [...new Set([...state.uploadedVideoIds, videoId])],
        })),
    }),
    {
      name: 'uploaded-videos-storage',
    }
  )
)
