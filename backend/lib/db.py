import logging
import certifi
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")
    ],
    "progress": [
        IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
        IndexModel([("wins", DESCENDING), ("spice", DESCENDING)], name="wins_spice"),
        IndexModel([("spice", DESCENDING), ("wins", DESCENDING)], name="spice_wins"),
        IndexModel([("hard_wins", DESCENDING), ("wins", DESCENDING)], name="hard_wins"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error(
                    "ensure_indexes(%s.%s): %s",
                    collection,
                    model.document["name"],
                    exc,
                )