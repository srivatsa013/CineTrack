from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import connect_db, close_db, get_db
from app.ml.hybrid import train_models

from app.routes import auth, content, ratings, watchlist, social, recommendations
from app.routes import notifications, collections, stats, shared_watchlist

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CineTrack API...")
    await connect_db()
    db = get_db()

    # Extra indexes
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.collections.create_index("user_id")
    await db.shared_watchlists.create_index("owner_id")
    await db.shared_watchlists.create_index("member_ids")

    try:
        await train_models(db)
    except Exception as e:
        logger.warning(f"ML training skipped on startup: {e}")

    yield
    await close_db()
    logger.info("CineTrack API shut down.")


app = FastAPI(title="CineTrack API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(content.router)
app.include_router(ratings.router)
app.include_router(watchlist.router)
app.include_router(social.router)
app.include_router(recommendations.router)
app.include_router(notifications.router)
app.include_router(collections.router)
app.include_router(stats.router)
app.include_router(shared_watchlist.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.APP_NAME}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}