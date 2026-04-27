import { useState } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'

export default function StarRating({ value = 0, onChange, max = 5, size = 20, readOnly = false }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={clsx('transition-transform duration-150', readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
        >
          <Star
            size={size}
            className={clsx('transition-colors duration-150', star <= display ? 'text-accent' : 'text-zinc-700')}
            fill={star <= display ? 'currentColor' : 'none'}
          />
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm font-semibold text-accent">{value}/{max}</span>}
    </div>
  )
}