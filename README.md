# 🎬 CineTrack — Personal Movie & Series Tracker

A full-stack social platform for tracking movies, series, and anime — built with **FastAPI, React, MongoDB Atlas, and a hybrid ML recommendation engine**. Inspired by Letterboxd, with added features like collaborative watchlists, year-in-review stats, and personalised recommendations that get smarter as you rate more content.

🔗 **Live Demo:** [cinetrack-iota.vercel.app](https://cinetrack-iota.vercel.app/)

---

## 🚀 Features

* 🎥 **Track & rate** movies, series, and anime — with 1–5 star ratings and reviews

* 🤖 **Hybrid ML recommendations** — content-based + collaborative filtering with genre preference controls

* 🔍 **Advanced search** — filter by genre, language, year range, minimum rating, and sort order

* 📋 **My Lists** — watchlist with episode journal, curated collections, and shared movie night lists with friends

* 📅 **Year in Review** — Spotify Wrapped-style breakdown of your watch history, top genres, and rating distribution

* 👥 **Social** — friends, activity feed, rating comparisons, and notifications

---

## 📁 Project Structure

```
cinetrack/
├── backend/
│   ├── app/
│   │   ├── ml/
│   │   │   ├── collaborative.py      # User-item matrix + neighbour-based CF
│   │   │   ├── content_based.py      # TF-IDF + cosine similarity
│   │   │   └── hybrid.py             # Adaptive weighted merge
│   │   ├── models/                   # Pydantic schemas
│   │   ├── routes/                   # FastAPI routers
│   │   ├── services/
│   │   │   ├── auth_service.py       # JWT + bcrypt
│   │   │   └── tmdb_service.py       # TMDB API client with TTL cache
│   │   ├── config.py
│   │   ├── database.py               # Motor async MongoDB
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js             # Axios + JWT interceptor
    │   ├── components/               # ContentCard, Layout, StarRating, etc.
    │   ├── context/authStore.js      # Zustand auth state
    │   ├── hooks/useQueries.js       # React Query hooks
    │   └── pages/                    # All page components
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🤖 ML Architecture

```
User Ratings + Watch History
        │
        ├──► Content-Based Filter
        │         TF-IDF on genres, keywords, cast, overview
        │         Cosine similarity against user taste profile
        │         Weight: 100% (cold) → 70% (warm)
        │
        └──► Collaborative Filter
                  User-item rating matrix (mean-centred)
                  Neighbour-based weighted scoring
                  Weight: 0% (cold) → 30% (warm)
                          │
                          ▼
              Hybrid Score = α × CB + (1−α) × CF
                          │
                          ▼
              Genre preference multipliers applied
                          │
                          ▼
              "Not interested" exclusions applied
                          │
                          ▼
                  Ranked Recommendations
```

### Cold Start Strategy

| Ratings logged | CB Weight | CF Weight |
|----------------|-----------|-----------|
| 0 – 4          | 100%      | 0%        |
| 5 – 14         | 80%       | 20%       |
| 15+            | 70%       | 30%       |

---

## 🖥️ Pages

<table>
  <tr>
    <td align="center" width="140"><b>🏠</b><br/><b>Home</b><br/><sub>Trending movies and series from TMDB</sub></td>
    <td align="center" width="140"><b>🔍</b><br/><b>Search</b><br/><sub>Text search + advanced filters — genre, language, year, rating</sub></td>
    <td align="center" width="140"><b>✨</b><br/><b>For You</b><br/><sub>Personalised hybrid recommendations with genre preference</sub></td>
    <td align="center" width="140"><b>🎬</b><br/><b>Content</b><br/><sub>Full details, community reviews, More Like Thist</sub></td>
  </tr>
  <tr>
    <td align="center" width="140"><b>📋</b><br/><b>My Lists</b><br/><sub>Watchlist · Collections · Shared movie night lists with friends</sub></td>
    <td align="center" width="140"><b>📅</b><br/><b>Year in Review</b><br/><sub>Wrapped-style stats — top genres, monthly chart, rating</sub></td>
    <td align="center" width="140"><b>👥</b><br/><b>Friends</b><br/><sub>Activity feed, friend requests, side-by-side rating comparison</sub></td>
    <td align="center" width="140"><b>👤</b><br/><b>Profile</b><br/><sub>Letterboxd-style — backdrop, stats, favorites, monthly diary</sub></td>
  </tr>
</table>

---

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center" width="120">
      <b>⚛️ Frontend</b><br/>
      <sub>React 18</sub><br/>
      <sub>Vite</sub><br/>
      <sub>Tailwind CSS</sub><br/>
      <sub>React Query</sub>
    </td>
    <td align="center" width="120">
      <b>⚡ Backend</b><br/>
      <sub>FastAPI</sub><br/>
      <sub>Python 3.11</sub><br/>
      <sub>JWT + bcrypt</sub><br/>
      <sub>TMDB API</sub>
    </td>
    <td align="center" width="120">
      <b>🗄️ Database</b><br/>
      <sub>MongoDB Atlas</sub><br/>
      <sub>TTL cache</sub><br/>
      <br/>
      <br/>
    </td>
    <td align="center" width="120">
      <b>🤖 ML</b><br/>
      <sub>Scikit-learn</sub><br/>
      <sub>TF-IDF</sub><br/>
      <sub>Cosine Similarity</sub><br/>
      <sub>NumPy</sub><br/>
    </td>
    <td align="center" width="120">
      <b>☁️ Deployment</b><br/>
      <sub>Vercel</sub><br/>
      <sub>(Frontend)</sub><br/>
      <sub>Render</sub><br/>
      <sub>(Backend)</sub><br/>
      <br/>
    </td>
  </tr>
</table>

---

## 🌍 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [cinetrack-iota.vercel.app](https://cinetrack-iota.vercel.app) |
| Backend API | Render | `https://cinetrack-api.onrender.com` |
| Database | MongoDB Atlas | Cloud |

---

<div align="center">
  <h2><b>CineTrack</b></h2>
  <h3>Made with 💗 by Srivatsa</h3>

  ---
</div>
