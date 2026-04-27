import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { contentApi, discoverApi } from '../api/client'
import ContentCard from '../components/content/ContentCard'
import { SkeletonGrid } from '../components/ui/SkeletonCard'

function useDebounce(v, delay = 400) {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), delay); return () => clearTimeout(t) }, [v, delay])
  return d
}

const SORT_OPTIONS = [
  { value: 'popularity.desc',           label: 'Most popular' },
  { value: 'vote_average.desc',         label: 'Highest rated' },
  { value: 'primary_release_date.desc', label: 'Newest first' },
  { value: 'primary_release_date.asc',  label: 'Oldest first' },
]

const CONTENT_TYPES = [
  { value: '',      label: 'All types' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv',    label: 'Series / Anime' },
]

const GENRES = [
  { id: 28,    name: 'Action' },      { id: 12,    name: 'Adventure' },
  { id: 16,    name: 'Animation' },   { id: 35,    name: 'Comedy' },
  { id: 80,    name: 'Crime' },       { id: 99,    name: 'Documentary' },
  { id: 18,    name: 'Drama' },       { id: 14,    name: 'Fantasy' },
  { id: 27,    name: 'Horror' },      { id: 10749, name: 'Romance' },
  { id: 878,   name: 'Sci-Fi' },      { id: 53,    name: 'Thriller' },
  { id: 10752, name: 'War' },         { id: 37,    name: 'Western' },
]

const LANGUAGES = [
  { value: '',   label: 'Any language' }, { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },     { value: 'ko', label: 'Korean' },
  { value: 'fr', label: 'French' },       { value: 'es', label: 'Spanish' },
  { value: 'hi', label: 'Hindi' },        { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },      { value: 'zh', label: 'Chinese' },
]

const CY = new Date().getFullYear()

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 pr-8 text-sm
            focus:outline-none focus:border-accent/40 transition-all">
          {options.map(o => <option key={o.value ?? o.id} value={o.value ?? o.id} className="bg-surface-800">{o.label ?? o.name}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  )
}

function Pill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-accent/10 text-accent text-[10px] px-2.5 py-1 rounded-full border border-accent/20">
      {label}
      <button onClick={onRemove}><X size={9} className="hover:text-white" /></button>
    </span>
  )
}

export default function SearchPage() {
  const [query,       setQuery]       = useState('')
  const debouncedQ                    = useDebounce(query)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [contentType, setContentType] = useState('')
  const [genreId,     setGenreId]     = useState('')
  const [yearFrom,    setYearFrom]    = useState('')
  const [yearTo,      setYearTo]      = useState('')
  const [language,    setLanguage]    = useState('')
  const [minRating,   setMinRating]   = useState('')
  const [sortBy,      setSortBy]      = useState('popularity.desc')

  const [results,     setResults]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [total,       setTotal]       = useState(0)
  const [mode,        setMode]        = useState('idle')

  const sentinelRef = useRef(null)
  const stateRef    = useRef({})
  const inputRef    = useRef(null)

  const activeFilterCount = [contentType, genreId, yearFrom, yearTo, language, minRating].filter(Boolean).length

  useEffect(() => {
    stateRef.current = { page, hasMore, loading, loadingMore, query: debouncedQ,
      contentType, genreId, yearFrom, yearTo, language, minRating, sortBy }
  })

  const doFetch = useCallback(async (opts, pg, append) => {
    const { q, contentType, genreId, yearFrom, yearTo, language, minRating, sortBy } = opts
    const isSearch = q && q.trim().length > 0
    const hasF = [contentType, genreId, yearFrom, yearTo, language, minRating].some(Boolean)

    if (!isSearch && !hasF) {
      setResults([]); setTotal(0); setHasMore(false); setMode('idle'); return
    }

    if (pg === 1) setLoading(true); else setLoadingMore(true)
    setMode(isSearch ? 'search' : 'discover')

    try {
      let newResults = [], newTotal = 0, newHasMore = false, curPage = pg

      if (isSearch) {
        let collected = [], tPages = 1
        while (true) {
          const res  = await contentApi.search(q.trim(), curPage)
          const raw  = res.data.results || []
          tPages     = res.data.total_pages
          newTotal   = res.data.total_results

          const filtered = contentType
            ? raw.filter(r => contentType === 'tv'
                ? (r.type === 'series' || r.type === 'anime')
                : r.type === contentType)
            : raw

          const refined = filtered.filter(r => {
            if (minRating && (r.vote_average || 0) < Number(minRating)) return false
            if (yearFrom || yearTo) {
              const y = parseInt((r.release_date || '').slice(0, 4)) || 0
              if (yearFrom && y < Number(yearFrom)) return false
              if (yearTo   && y > Number(yearTo))   return false
            }
            return true
          })

          collected = [...collected, ...refined]
          if (collected.length >= 10 || curPage >= tPages) break
          curPage++
        }
        newResults  = collected
        newHasMore  = curPage < stateRef.current.page || false

      } else {
        const params = { page: pg, sort_by: sortBy || 'popularity.desc' }
        if (contentType) params.content_type = contentType
        if (genreId)     params.genre_id     = Number(genreId)
        if (yearFrom)    params.year_from    = Number(yearFrom)
        if (yearTo)      params.year_to      = Number(yearTo)
        if (language)    params.language     = language
        if (minRating)   params.min_rating   = Number(minRating)

        const res   = await discoverApi.advanced(params)
        newResults  = res.data.results
        newTotal    = res.data.total_results
        newHasMore  = pg < res.data.total_pages
        curPage     = pg
      }

      setResults(prev => append ? [...prev, ...newResults] : newResults)
      setTotal(newTotal)
      setHasMore(newHasMore)
      setPage(curPage)

    } catch (e) { console.error(e) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [])

  // Re-fetch on any change
  useEffect(() => {
    doFetch({ q: debouncedQ, contentType, genreId, yearFrom, yearTo, language, minRating, sortBy }, 1, false)
  }, [debouncedQ, contentType, genreId, yearFrom, yearTo, language, minRating, sortBy])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      const s = stateRef.current
      if (s.hasMore && !s.loading && !s.loadingMore) {
        doFetch({ q: s.query, contentType: s.contentType, genreId: s.genreId,
          yearFrom: s.yearFrom, yearTo: s.yearTo, language: s.language,
          minRating: s.minRating, sortBy: s.sortBy }, s.page + 1, true)
      }
    }, { threshold: 1.0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [doFetch])

  // / keyboard shortcut
  useEffect(() => {
    const h = e => { if (e.key === '/' && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const resetFilters = () => {
    setContentType(''); setGenreId(''); setYearFrom(''); setYearTo('')
    setLanguage(''); setMinRating(''); setSortBy('popularity.desc')
  }

  return (
    <div className="min-h-screen">
      {/* Sticky search + filter header */}
      <div className="glass sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Row 1: input + toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                ref={inputRef}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm
                  focus:outline-none focus:border-accent/40 focus:bg-white/10 placeholder-zinc-600 transition-all"
                placeholder="Search titles…  or use filters to browse  ( / )"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query
                ? <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                : <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded">/</span>
              }
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 shrink-0 ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-accent text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && !filtersOpen && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {contentType && <Pill label={CONTENT_TYPES.find(t => t.value === contentType)?.label} onRemove={() => setContentType('')} />}
              {genreId     && <Pill label={GENRES.find(g => String(g.id) === genreId)?.name}        onRemove={() => setGenreId('')} />}
              {language    && <Pill label={LANGUAGES.find(l => l.value === language)?.label}         onRemove={() => setLanguage('')} />}
              {yearFrom    && <Pill label={`From ${yearFrom}`}   onRemove={() => setYearFrom('')} />}
              {yearTo      && <Pill label={`To ${yearTo}`}       onRemove={() => setYearTo('')} />}
              {minRating   && <Pill label={`≥ ${minRating}/10`}  onRemove={() => setMinRating('')} />}
              <button onClick={resetFilters} className="text-[10px] text-zinc-700 hover:text-white transition-colors px-2 py-1 rounded-full hover:bg-white/5 ml-1">
                Clear all
              </button>
            </div>
          )}

          {/* Expanded filter panel */}
          {filtersOpen && (
            <div className="bg-surface-800 border border-white/5 rounded-2xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                <FilterSelect label="Type"     value={contentType} onChange={setContentType} options={CONTENT_TYPES} />
                <FilterSelect label="Genre"    value={genreId}     onChange={setGenreId}     options={[{ id: '', name: 'Any genre' }, ...GENRES]} />
                <FilterSelect label="Language" value={language}    onChange={setLanguage}    options={LANGUAGES} />
                <FilterSelect label="Sort by"  value={sortBy}      onChange={setSortBy}      options={SORT_OPTIONS} />
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1.5">Year from</label>
                  <input type="number" min="1900" max={CY} placeholder="e.g. 2000" value={yearFrom}
                    onChange={e => setYearFrom(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40 transition-all placeholder-zinc-700" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1.5">Year to</label>
                  <input type="number" min="1900" max={CY} placeholder={`e.g. ${CY}`} value={yearTo}
                    onChange={e => setYearTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40 transition-all placeholder-zinc-700" />
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-widest">Min TMDB rating</label>
                    <span className="text-xs text-accent font-medium">{minRating ? `${minRating}/10` : 'Any'}</span>
                  </div>
                  <input type="range" min="0" max="9" step="0.5" value={minRating || 0}
                    onChange={e => setMinRating(e.target.value === '0' ? '' : e.target.value)}
                    className="w-full accent-accent h-1" />
                </div>
                <button onClick={resetFilters} className="text-xs text-zinc-600 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 whitespace-nowrap">
                  Reset all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Count */}
        {!loading && total > 0 && mode !== 'idle' && (
          <p className="text-xs text-zinc-600 mb-4 tabular-nums">
            {total.toLocaleString()} {mode === 'search' ? `results for "${debouncedQ}"` : 'titles'}
          </p>
        )}

        {/* Skeletons */}
        {loading && <SkeletonGrid count={mode === 'search' ? 30 : 20} compact={mode === 'search'} />}

        {/* Search = compact dense grid */}
        {!loading && mode === 'search' && results.length > 0 && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2">
              {results.map(c => <ContentCard key={c.id} content={c} compact />)}
            </div>
            <div ref={sentinelRef} className="flex items-center justify-center py-10">
              {loadingMore && <Loader2 size={18} className="text-accent animate-spin" />}
              {!hasMore && !loadingMore && <p className="text-xs text-zinc-800">— end of results —</p>}
            </div>
          </>
        )}

        {/* Discover = standard card grid */}
        {!loading && mode === 'discover' && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map(c => <ContentCard key={c.id} content={c} />)}
            </div>
            <div ref={sentinelRef} className="flex items-center justify-center py-10">
              {loadingMore && <Loader2 size={18} className="text-accent animate-spin" />}
              {!hasMore && !loadingMore && <p className="text-xs text-zinc-800">— end of results —</p>}
            </div>
          </>
        )}

        {/* No results */}
        {!loading && (mode === 'search' || mode === 'discover') && results.length === 0 && (
          <div className="text-center py-28">
            <Search size={40} className="mx-auto mb-4 text-zinc-800" />
            <p className="text-zinc-500 font-medium">No results found</p>
            <p className="text-zinc-700 text-sm mt-1">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Idle */}
        {mode === 'idle' && (
          <div className="text-center py-32">
            <p className="font-display text-5xl text-zinc-800 italic mb-3">Find anything.</p>
            <p className="text-zinc-700 text-sm mb-1">Search by title — or use filters to browse without typing</p>
            <p className="text-zinc-800 text-xs">Genre · Language · Year · Rating · Sort</p>
          </div>
        )}
      </div>
    </div>
  )
}