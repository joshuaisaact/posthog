import { LemonModal } from '@posthog/lemon-ui'

export interface StepScreenshotModalProps {
    mediaId: string
    isOpen: boolean
    onClose: () => void
}

export function StepScreenshotModal({ mediaId, isOpen, onClose }: StepScreenshotModalProps): JSX.Element {
    const imageUrl = `/uploaded_media/${mediaId}`

    return (
        <LemonModal isOpen={isOpen} onClose={onClose} title="Element screenshot" width="auto">
            <img src={imageUrl} alt="Element screenshot" className="max-w-full max-h-[70vh]" />
        </LemonModal>
    )
}
