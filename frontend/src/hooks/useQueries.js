import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentApi, ratingsApi, watchlistApi, socialApi, recommendationsApi, collectionsApi } from '../api/client'
import toast from 'react-hot-toast'

// ── Content ───────────────────────────────────────────────────────────────────
export const useTrending = (type = 'all') =>
  useQuery({ queryKey: ['trending', type], queryFn: () => contentApi.trending(type).then(r => r.data.results), staleTime: 5 * 60 * 1000 })

export const useContentDetail = (id) =>
  useQuery({ queryKey: ['content', id], queryFn: () => contentApi.detail(id).then(r => r.data), enabled: !!id })

export const useContentRatings = (contentId) =>
  useQuery({ queryKey: ['ratings', 'content', contentId], queryFn: () => ratingsApi.forContent(contentId).then(r => r.data), enabled: !!contentId })

// ── Watchlist ─────────────────────────────────────────────────────────────────
export const useWatchlist = (status) =>
  useQuery({ queryKey: ['watchlist', status], queryFn: () => watchlistApi.get(status).then(r => r.data) })

export const useAddToWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => watchlistApi.add(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); toast.success('Added to watchlist!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

export const useUpdateWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => watchlistApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); toast.success('Updated!') },
  })
}

export const useRemoveFromWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => watchlistApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); toast.success('Removed') },
  })
}

export const useAddEpisodeNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, data }) => watchlistApi.addEpisodeNote(entryId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); toast.success('Note added!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

export const useDeleteEpisodeNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, noteId }) => watchlistApi.deleteEpisodeNote(entryId, noteId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }) },
  })
}

// ── Ratings ───────────────────────────────────────────────────────────────────
export const useMyRatings = () =>
  useQuery({ queryKey: ['ratings', 'me'], queryFn: () => ratingsApi.mine().then(r => r.data) })

export const useAddRating = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => ratingsApi.add(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ratings'] })
      qc.invalidateQueries({ queryKey: ['content', vars.content_id] })
      toast.success('Rating saved!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

// ── Social ────────────────────────────────────────────────────────────────────
export const useFriends = () =>
  useQuery({ queryKey: ['friends'], queryFn: () => socialApi.friends().then(r => r.data) })

export const useFeed = (page = 1) =>
  useQuery({ queryKey: ['feed', page], queryFn: () => socialApi.feed(page).then(r => r.data) })

export const useSendFriendRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username) => socialApi.sendRequest(username),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends'] }); toast.success('Friend request sent!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

export const useAcceptFriendRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => socialApi.acceptRequest(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends'] }); toast.success('Friend added!') },
  })
}

// ── Recommendations ───────────────────────────────────────────────────────────
export const useRecommendations = (topN = 20, contentType = null) =>
  useQuery({
    queryKey: ['recommendations', topN, contentType],
    queryFn: () => recommendationsApi.get(topN, contentType).then(r => r.data.recommendations),
    staleTime: 10 * 60 * 1000,
  })

export const useSimilarContent = (contentId) =>
  useQuery({
    queryKey: ['similar', contentId],
    queryFn: () => recommendationsApi.similar(contentId).then(r => r.data.similar),
    enabled: !!contentId,
    staleTime: 10 * 60 * 1000,
  })

export const useMarkNotInterested = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contentId) => recommendationsApi.markNotInterested(contentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recommendations'] }); toast.success('Got it — won\'t show again') },
  })
}

export const useGenrePrefs = () =>
  useQuery({ queryKey: ['genre-prefs'], queryFn: () => recommendationsApi.getGenrePrefs().then(r => r.data.genre_preferences) })

export const useUpdateGenrePrefs = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => recommendationsApi.updateGenrePrefs(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['genre-prefs', 'recommendations'] }); toast.success('Preferences saved!') },
  })
}

// ── Collections ───────────────────────────────────────────────────────────────
export const useCollections = () =>
  useQuery({ queryKey: ['collections'], queryFn: () => collectionsApi.list().then(r => r.data.collections) })

export const useCollection = (id) =>
  useQuery({ queryKey: ['collection', id], queryFn: () => collectionsApi.get(id).then(r => r.data), enabled: !!id })

export const useAddToCollection = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ colId, contentId }) => collectionsApi.addContent(colId, contentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); toast.success('Added to collection!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

// ── Year in Review ────────────────────────────────────────────────────────────
import { statsApi, discoverApi, sharedWatchlistApi } from '../api/client'

export const useYearInReview = (year) =>
  useQuery({
    queryKey: ['year-in-review', year],
    queryFn: () => statsApi.yearInReview(year).then(r => r.data),
    staleTime: 30 * 60 * 1000,
  })

// ── Advanced Discover ─────────────────────────────────────────────────────────
export const useDiscover = (params, enabled = true) =>
  useQuery({
    queryKey: ['discover', params],
    queryFn: () => discoverApi.advanced(params).then(r => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

// ── Shared Watchlists ─────────────────────────────────────────────────────────
export const useSharedWatchlists = () =>
  useQuery({
    queryKey: ['shared-watchlists'],
    queryFn: () => sharedWatchlistApi.list().then(r => r.data.shared_watchlists),
  })

export const useSharedWatchlist = (id) =>
  useQuery({
    queryKey: ['shared-watchlist', id],
    queryFn: () => sharedWatchlistApi.get(id).then(r => r.data),
    enabled: !!id,
  })

export const useCreateSharedWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => sharedWatchlistApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shared-watchlists'] }); toast.success('Movie night list created!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

export const useInviteToSharedWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, username }) => sharedWatchlistApi.invite(id, username),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['shared-watchlist', id] }); toast.success('Friend invited!') },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  })
}

export const useAddToSharedWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contentId }) => sharedWatchlistApi.addContent(id, contentId),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['shared-watchlist', id] }); toast.success('Added!') },
  })
}

export const useRemoveFromSharedWatchlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contentId }) => sharedWatchlistApi.removeContent(id, contentId),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['shared-watchlist', id] }),
  })
}