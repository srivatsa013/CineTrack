"""
Content-Based Filtering
─────────────────────────────────────────────────────────────────────────────
Builds a TF-IDF feature vector for each content item using:
  - Genres
  - Keywords / tags
  - Cast names
  - Director
  - Overview text

Then computes cosine similarity between the user's taste profile
(average of vectors for content they rated highly) and all other content.
"""

import numpy as np
import logging
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


def build_feature_string(doc: Dict) -> str:
    """
    Combine all textual features for a content item into a single string
    that TF-IDF can vectorize.
    Weight important fields by repeating them.
    """
    parts = []

    # Genres (high weight — repeat 3x)
    genres = " ".join(doc.get("genres", [])).lower().replace(" ", "_")
    parts.extend([genres] * 3)

    # Content type (movie / series / anime) — repeated 2x
    content_type = doc.get("type", "")
    parts.extend([content_type] * 2)

    # Keywords
    keywords = " ".join(doc.get("keywords", [])).lower().replace(" ", "_")
    parts.append(keywords)

    # Cast (lower weight)
    cast = " ".join(doc.get("cast", [])).lower().replace(" ", "_")
    parts.append(cast)

    # Director (if exists)
    director = (doc.get("director") or "").lower().replace(" ", "_")
    if director:
        parts.append(director)

    # Original language as a feature
    lang = doc.get("original_language", "")
    if lang:
        parts.append(f"lang_{lang}")

    # Overview text (raw — TF-IDF handles it)
    overview = (doc.get("overview") or "").lower()
    parts.append(overview)

    return " ".join(p for p in parts if p.strip())


class ContentBasedFilter:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            ngram_range=(1, 2),
        )
        self.content_ids: List[str] = []          # parallel to matrix rows
        self.tfidf_matrix = None
        self._fitted = False

    def fit(self, content_docs: List[Dict]):
        """
        Build the TF-IDF matrix from all content in the database.
        Call this during app startup and periodically (e.g. daily cron).
        """
        if not content_docs:
            logger.warning("ContentBasedFilter: no content documents to fit on.")
            return

        self.content_ids = [str(doc["_id"]) for doc in content_docs]
        feature_strings = [build_feature_string(doc) for doc in content_docs]

        self.tfidf_matrix = self.vectorizer.fit_transform(feature_strings)
        self._fitted = True
        logger.info(f"ContentBasedFilter fitted on {len(content_docs)} items. "
                    f"Matrix shape: {self.tfidf_matrix.shape}")

    def recommend(
        self,
        liked_content_ids: List[str],
        exclude_ids: Optional[List[str]] = None,
        top_n: int = 20,
        content_type_filter: Optional[str] = None,
        content_docs_map: Optional[Dict[str, Dict]] = None,
    ) -> List[Dict]:
        """
        Given a list of content IDs the user liked (rated ≥ 7),
        compute a taste profile vector and find most similar unseen content.

        Returns: [{"content_id": ..., "score": ...}, ...]
        """
        if not self._fitted or self.tfidf_matrix is None:
            logger.warning("ContentBasedFilter not fitted yet.")
            return []

        exclude = set(exclude_ids or [])

        # Find row indices for liked content
        liked_indices = [
            self.content_ids.index(cid)
            for cid in liked_content_ids
            if cid in self.content_ids
        ]
        if not liked_indices:
            return []

        # Build taste profile: mean of liked vectors
        liked_vectors = self.tfidf_matrix[liked_indices]
        profile_vector = np.asarray(liked_vectors.mean(axis=0))

        # Cosine similarity between profile and all content
        similarities = cosine_similarity(profile_vector, self.tfidf_matrix)[0]

        # Build ranked list
        ranked = []
        for idx, score in enumerate(similarities):
            cid = self.content_ids[idx]
            if cid in exclude:
                continue
            if content_type_filter and content_docs_map:
                doc = content_docs_map.get(cid, {})
                if doc.get("type") != content_type_filter:
                    continue
            ranked.append({"content_id": cid, "score": float(score)})

        ranked.sort(key=lambda x: x["score"], reverse=True)
        return ranked[:top_n]

    def get_similar(self, content_id: str, top_n: int = 10) -> List[Dict]:
        """
        Find content most similar to a given item.
        Used for "More like this" section on the content detail page.
        """
        if not self._fitted or content_id not in self.content_ids:
            return []

        idx = self.content_ids.index(content_id)
        item_vector = self.tfidf_matrix[idx]
        similarities = cosine_similarity(item_vector, self.tfidf_matrix)[0]

        ranked = [
            {"content_id": self.content_ids[i], "score": float(s)}
            for i, s in enumerate(similarities)
            if self.content_ids[i] != content_id
        ]
        ranked.sort(key=lambda x: x["score"], reverse=True)
        return ranked[:top_n]


# Singleton instance
content_filter = ContentBasedFilter()