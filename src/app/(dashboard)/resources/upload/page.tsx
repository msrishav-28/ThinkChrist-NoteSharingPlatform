import { UploadForm } from '@/features/resources'

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Resource</h1>
        <p className="text-muted-foreground">
          Share your notes and study materials with fellow students
        </p>
      </div>
      
      <UploadForm />
    </div>
  )
}