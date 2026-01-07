import clsx from 'clsx'

export interface StepScreenshotThumbnailProps {
    mediaId: string
    onClick?: () => void
    className?: string
}

export function StepScreenshotThumbnail({ mediaId, onClick, className }: StepScreenshotThumbnailProps): JSX.Element {
    return (
        <img
            src={`/uploaded_media/${mediaId}`}
            alt="Element screenshot"
            className={clsx('rounded cursor-pointer border hover:border-primary transition-colors', className)}
            style={{ maxHeight: 48, maxWidth: 150 }}
            onClick={onClick}
            title="Click to view screenshot"
            onError={(e) => (e.currentTarget.style.display = 'none')}
        />
    )
}
