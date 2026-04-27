import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ct_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ct_token')
      localStorage.removeItem('ct_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
}

export const contentApi = {
  search: (q, page = 1) => api.get('/content/search', { params: { q, page } }),
  trending: (type = 'all') => api.get('/content/trending', { params: { type } }),
  anime: (page = 1) => api.get('/content/anime', { params: { page } }),
  detail: (id) => api.get(`/content/${id}`),
}

export const ratingsApi = {
  add: (data) => api.post('/ratings/', data),
  mine: (page = 1) => api.get('/ratings/me', { params: { page } }),
  forContent: (contentId, page = 1) => api.get(`/ratings/content/${contentId}`, { params: { page } }),
  delete: (id) => api.delete(`/ratings/${id}`),
}

export const watchlistApi = {
  add: (data) => api.post('/watchlist/', data),
  get: (status, page = 1) => api.get('/watchlist/', { params: { status, page } }),
  update: (id, data) => api.put(`/watchlist/${id}`, data),
  remove: (id) => api.delete(`/watchlist/${id}`),
  history: (page = 1) => api.get('/watchlist/history', { params: { page } }),
  addEpisodeNote: (entryId, data) => api.post(`/watchlist/${entryId}/episodes`, data),
  deleteEpisodeNote: (entryId, noteId) => api.delete(`/watchlist/${entryId}/episodes/${noteId}`),
}

export const socialApi = {
  sendRequest: (username) => api.post(`/social/friends/request/${username}`),
  acceptRequest: (id) => api.post(`/social/friends/accept/${id}`),
  removeFriend: (id) => api.delete(`/social/friends/${id}`),
  friends: () => api.get('/social/friends'),
  feed: (page = 1) => api.get('/social/feed', { params: { page } }),
  compare: (friendId) => api.get(`/social/compare/${friendId}`),
}

export const recommendationsApi = {
  get: (topN = 20, contentType = null) =>
    api.get('/recommendations/', { params: { top_n: topN, content_type: contentType } }),
  similar: (contentId, topN = 10) =>
    api.get(`/recommendations/similar/${contentId}`, { params: { top_n: topN } }),
  markNotInterested: (contentId) => api.post(`/recommendations/not-interested/${contentId}`),
  undoNotInterested: (contentId) => api.delete(`/recommendations/not-interested/${contentId}`),
  getGenrePrefs: () => api.get('/recommendations/genre-preferences'),
  updateGenrePrefs: (data) => api.put('/recommendations/genre-preferences', data),
}

export const collectionsApi = {
  list: () => api.get('/collections/'),
  get: (id) => api.get(`/collections/${id}`),
  create: (data) => api.post('/collections/', data),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
  addContent: (colId, contentId) => api.post(`/collections/${colId}/add/${contentId}`),
  removeContent: (colId, contentId) => api.delete(`/collections/${colId}/remove/${contentId}`),
}

export const statsApi = {
  yearInReview: (year) => api.get('/stats/year-in-review', { params: { year } }),
}

export const discoverApi = {
  advanced: (params) => api.get('/content/discover/advanced', { params }),
}

export const sharedWatchlistApi = {
  list:          ()                              => api.get('/shared-watchlists/'),
  get:           (id)                            => api.get(`/shared-watchlists/${id}`),
  create:        (data)                          => api.post('/shared-watchlists/', data),
  update:        (id, data)                      => api.put(`/shared-watchlists/${id}`, data),
  delete:        (id)                            => api.delete(`/shared-watchlists/${id}`),
  invite:        (id, username)                  => api.post(`/shared-watchlists/${id}/invite/${username}`),
  removeMember:  (id, memberId)                  => api.delete(`/shared-watchlists/${id}/member/${memberId}`),
  addContent:    (id, contentId)                 => api.post(`/shared-watchlists/${id}/content`, { content_id: contentId }),
  removeContent: (id, contentId)                 => api.delete(`/shared-watchlists/${id}/content/${contentId}`),
}