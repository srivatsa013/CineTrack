from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_db():
    """Connect to MongoDB Atlas on app startup."""
    logger.info("Connecting to MongoDB...")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]

    # Verify connection
    await db_instance.client.admin.command("ping")
    logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")

    # Create indexes
    await create_indexes()


async def close_db():
    """Close MongoDB connection on app shutdown."""
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


async def create_indexes():
    """Create indexes for performance."""
    db = db_instance.db

    # Users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)

    # Content
    await db.content.create_index("tmdb_id", unique=True)
    await db.content.create_index("type")
    await db.content.create_index([("title", "text"), ("overview", "text")])

    # Ratings
    await db.ratings.create_index([("user_id", 1), ("content_id", 1)], unique=True)
    await db.ratings.create_index("user_id")
    await db.ratings.create_index("content_id")

    # Watch history
    await db.watch_history.create_index([("user_id", 1), ("content_id", 1)])
    await db.watch_history.create_index("user_id")

    # Watchlist
    await db.watchlist.create_index([("user_id", 1), ("content_id", 1)], unique=True)

    logger.info("Database indexes created.")


def get_db():
    """Return the database instance."""
    return db_instance.db