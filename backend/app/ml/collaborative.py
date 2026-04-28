"""
Collaborative Filtering
─────────────────────────────────────────────────────────────────────────────
Builds a user-item rating matrix and finds users with similar taste.
For a target user, recommends content highly rated by similar users
but not yet seen by the target.

Uses memory-based (cosine similarity) approach — practical for
small/medium closed social platforms like CineTrack.
"""

import numpy as np
import logging
from typing import List, Dict, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class CollaborativeFilter:
    def __init__(self):
        self.user_ids: List[str] = []
        self.content_ids: List[str] = []
        self.matrix: Optional[np.ndarray] = None       # users × content
        self.user_sim_matrix: Optional[np.ndarray] = None
        self._fitted = False

    def fit(self, ratings: List[Dict]):
        """
        Build the user-item matrix from a list of rating documents.
        Each doc: {"user_id": ..., "content_id": ..., "rating": float}

        Ratings are normalised (mean-centered per user) before similarity.
        """
        if not ratings:
            logger.warning("CollaborativeFilter: no ratings to fit on.")
            return

        # Build index maps
        user_set = sorted({r["user_id"] for r in ratings})
        content_set = sorted({r["content_id"] for r in ratings})
        self.user_ids = user_set
        self.content_ids = content_set

        user_idx = {u: i for i, u in enumerate(user_set)}
        content_idx = {c: i for i, c in enumerate(content_set)}

        # Fill matrix
        self.matrix = np.zeros((len(user_set), len(content_set)), dtype=np.float32)
        for r in ratings:
            ui = user_idx[r["user_id"]]
            ci = content_idx[r["content_id"]]
            self.matrix[ui, ci] = r["rating"]

        # Mean-center each user's ratings (ignoring zeros)
        self._normalized = self.matrix.copy()
        for i in range(len(user_set)):
            row = self._normalized[i]
            rated_mask = row != 0
            if rated_mask.sum() > 0:
                mean = row[rated_mask].mean()
                row[rated_mask] -= mean
            self._normalized[i] = row

        # Compute user-user similarity
        self.user_sim_matrix = cosine_similarity(self._normalized)
        np.fill_diagonal(self.user_sim_matrix, 0)  # ignore self-similarity

        self._fitted = True
        logger.info(
            f"CollaborativeFilter fitted: {len(user_set)} users × "
            f"{len(content_set)} content items."
        )

    def recommend(
        self,
        user_id: str,
        exclude_ids: Optional[List[str]] = None,
        top_n: int = 20,
        n_neighbors: int = 20,
    ) -> List[Dict]:
        """
        Recommend content for a user based on what similar users liked.
        Returns: [{"content_id": ..., "score": ...}, ...]
        """
        if not self._fitted or user_id not in self.user_ids:
            return []

        exclude = set(exclude_ids or [])
        ui = self.user_ids.index(user_id)
        sim_row = self.user_sim_matrix[ui]

        # Top-N most similar users
        neighbor_indices = np.argsort(sim_row)[::-1][:n_neighbors]
        neighbor_sims = sim_row[neighbor_indices]

        # Weighted average of neighbor ratings for each unseen content
        scores: Dict[int, float] = {}
        sim_sums: Dict[int, float] = {}

        for ni, sim in zip(neighbor_indices, neighbor_sims):
            if sim <= 0:
                continue
            for ci, rating in enumerate(self.matrix[ni]):
                if rating == 0:
                    continue
                cid = self.content_ids[ci]
                if cid in exclude:
                    continue
                # Skip if target user already rated this
                if self.matrix[ui, ci] != 0:
                    continue
                scores[ci] = scores.get(ci, 0) + sim * rating
                sim_sums[ci] = sim_sums.get(ci, 0) + sim

        if not scores:
            return []

        # Normalise by similarity sum
        results = []
        for ci, weighted_sum in scores.items():
            if sim_sums[ci] > 0:
                predicted = weighted_sum / sim_sums[ci]
                results.append({
                    "content_id": self.content_ids[ci],
                    "score": float(predicted),
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_n]

    def get_similar_users(self, user_id: str, top_n: int = 5) -> List[Tuple[str, float]]:
        """Return the most similar users to a given user."""
        if not self._fitted or user_id not in self.user_ids:
            return []
        ui = self.user_ids.index(user_id)
        sim_row = self.user_sim_matrix[ui]
        top_indices = np.argsort(sim_row)[::-1][:top_n]
        return [(self.user_ids[i], float(sim_row[i])) for i in top_indices if sim_row[i] > 0]


# Singleton instance
collab_filter = CollaborativeFilter()