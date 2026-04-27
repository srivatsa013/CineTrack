import { useState } from 'react'
import { X } from 'lucide-react'
import StarRating from './StarRating'
import { useAddRating } from '../../hooks/useQueries'

export default function RatingModal({ content, existingRating, onClose }) {
  const [rating, setRating] = useState(existingRating?.rating || 0)
  const [review, setReview] = useState(existingRating?.review || '')
  const [spoiler, setSpoiler] = useState(existingRating?.contains_spoiler || false)
  const addRating = useAddRating()

  const handleSubmit = async () => {
    if (!rating) return
    await addRating.mutateAsync({ content_id: content.id, rating, review: review || null, contains_spoiler: spoiler })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Rate this</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{content.title}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="mb-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Your rating</p>
          <StarRating value={rating} onChange={setRating} size={32} />
        </div>

        <div className="mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Review (optional)</p>
          <textarea
            className="input resize-none h-28 text-sm"
            placeholder="What did you think?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={2000}
          />
          <p className="text-right text-xs text-zinc-700 mt-1">{review.length}/2000</p>
        </div>

        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="accent-accent w-4 h-4" />
          <span className="text-sm text-zinc-400">Contains spoilers</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 border border-white/10">Cancel</button>
          <button onClick={handleSubmit} disabled={!rating || addRating.isPending} className="btn-primary flex-1">
            {addRating.isPending ? 'Saving...' : existingRating ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}