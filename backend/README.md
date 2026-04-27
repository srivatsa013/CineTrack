# CineTrack — Backend

FastAPI + MongoDB Atlas + ML Recommendations

## Quick Start

### 1. Clone & set up environment
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in:
#   MONGODB_URL  — your MongoDB Atlas connection string
#   SECRET_KEY   — any long random string
#   TMDB_API_KEY — free key from https://www.themoviedb.org/settings/api
```

### 3. Run the server
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Open API docs
```
http://localhost:8000/docs
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content/search?q=...` | Search movies/series/anime |
| GET | `/api/content/trending` | Trending content |
| GET | `/api/content/anime` | Discover anime |
| GET | `/api/content/{id}` | Content detail |

### Ratings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ratings/` | Add or update a rating |
| GET | `/api/ratings/me` | My ratings |
| GET | `/api/ratings/content/{id}` | All ratings for content |
| DELETE | `/api/ratings/{id}` | Delete a rating |

### Watchlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/watchlist/` | Add to watchlist |
| GET | `/api/watchlist/` | Get my watchlist |
| PUT | `/api/watchlist/{id}` | Update status |
| DELETE | `/api/watchlist/{id}` | Remove entry |
| GET | `/api/watchlist/history` | Watch history |

### Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/social/friends/request/{username}` | Send friend request |
| POST | `/api/social/friends/accept/{id}` | Accept friend request |
| DELETE | `/api/social/friends/{id}` | Remove friend |
| GET | `/api/social/friends` | List friends |
| GET | `/api/social/feed` | Activity feed |
| GET | `/api/social/compare/{friend_id}` | Compare ratings |

### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/` | Personalised picks |
| GET | `/api/recommendations/similar/{id}` | "More like this" |
| POST | `/api/recommendations/retrain` | Retrain ML models |

---

## ML Architecture

```
User Ratings + Watch History
        │
        ├──► Content-Based Filter (TF-IDF + Cosine Similarity)
        │         Weight: 70% (warm users) → 100% (cold users)
        │
        └──► Collaborative Filter (User-Item Matrix + Neighbor CF)
                  Weight: 30% (warm users) → 0% (cold users)
                          │
                          ▼
                  Hybrid Score = 0.7 × CB + 0.3 × CF
                          │
                          ▼
                  Ranked Recommendations
```

### Cold Start Strategy
| Ratings | CB Weight | CF Weight |
|---------|-----------|-----------|
| 0–4 | 100% | 0% |
| 5–14 | 80% | 20% |
| 15+ | 70% | 30% |