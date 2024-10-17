import React, { useState, useCallback } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ThumbnailCropDialogProps {
  isOpen: boolean
  imageUrl: string
  onCropComplete: ({ file, url }: { file: File; url: string }) => void
  onCancel: () => void
}

export const ThumbnailCropDialog: React.FC<ThumbnailCropDialogProps> = ({
  isOpen,
  onCancel,
  imageUrl,
  onCropComplete,
}) => {
  const [cropper, setCropper] = useState<Cropper>()

  const handleCropComplete = useCallback(async () => {
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 640,
        height: 360,
      })

      croppedCanvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to crop image')
          return
        }
        const file = new File([blob], 'thumbnail.webp', {
          type: 'image/webp',
        })
        onCropComplete({ file, url: URL.createObjectURL(file) })
      }, 'image/webp')
    }
  }, [cropper, onCropComplete])

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Thumbnail</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Cropper
            src={imageUrl}
            style={{ height: 400, width: '100%' }}
            aspectRatio={16 / 9}
            guides={true}
            viewMode={1}
            minCropBoxHeight={10}
            minCropBoxWidth={10}
            background={false}
            responsive={true}
            checkOrientation={false}
            onInitialized={(instance) => setCropper(instance)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCropComplete}>Confirm Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
