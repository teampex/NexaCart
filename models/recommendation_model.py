
import joblib
import pandas as pd
from pathlib import Path

# Saved recommendation artifacts load karke category/browsing signals ke liye ranking helpers deta hai.
MODEL_DIR = Path(__file__).resolve().parent


# ============================================================
# LOAD MODEL ARTIFACTS
# ============================================================

item_similarity_df = joblib.load(MODEL_DIR / "item_similarity.pkl")

category_product_probability = joblib.load(MODEL_DIR / "category_product_probability.pkl")

product_popularity = joblib.load(MODEL_DIR / "product_popularity.pkl")

product_list = joblib.load(MODEL_DIR / "product_list.pkl")

model_config = joblib.load(MODEL_DIR / "recommendation_config.pkl")


# ============================================================
# MODEL CONFIGURATION
# ============================================================

CF_WEIGHT = model_config["cf_weight"]
BROWSING_WEIGHT = model_config["browsing_weight"]
DEFAULT_N = model_config["recommendation_count"]


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_scores(scores):

    if len(scores) == 0:
        return scores

    if scores.max() == scores.min():
        return scores * 0

    return (
        (scores - scores.min())
        / (scores.max() - scores.min())
    )


# ============================================================
# BROWSING-BASED COLD START
# ============================================================

def cold_start_browsing_recommend(
    browsing_categories,
    n=5
):

    scores = pd.Series(
        0.0,
        index=category_product_probability.columns
    )

    for category in browsing_categories:

        if category in category_product_probability.index:

            scores += (
                category_product_probability
                .loc[category]
            )

    return (
        scores
        .sort_values(ascending=False)
        .head(n)
    )


# ============================================================
# WEBSITE RECOMMENDATION FUNCTION
# ============================================================

def recommend_for_website(
    customer_id,
    browsing_categories=None,
    purchase_history=None,
    n=None
):

    browsing_categories = browsing_categories or []
    purchase_history = purchase_history or []

    if n is None:
        n = DEFAULT_N


    # --------------------------------------------------------
    # CASE 1: CUSTOMER WITH PURCHASE HISTORY
    # --------------------------------------------------------

    # The similarity matrix is indexed by product names, not customer IDs.
    # Personalize from the supplied purchase history instead of comparing the
    # customer ID to that product index.
    purchased_products = [
        product
        for product in purchase_history
        if product in item_similarity_df.index
    ]

    if purchased_products:

            cf_scores = pd.Series(
                0.0,
                index=item_similarity_df.index
            )

            for product in purchased_products:

                cf_scores += (
                    item_similarity_df[product]
                )

            cf_scores = cf_scores.drop(
                labels=purchased_products,
                errors="ignore"
            )

            browsing_scores = pd.Series(
                0.0,
                index=category_product_probability.columns
            )

            for category in browsing_categories:

                if category in category_product_probability.index:

                    browsing_scores += (
                        category_product_probability
                        .loc[category]
                    )

            browsing_scores = browsing_scores.drop(
                labels=purchased_products,
                errors="ignore"
            )

            cf_scores = normalize_scores(cf_scores)
            browsing_scores = normalize_scores(browsing_scores)

            all_products = sorted(
                set(cf_scores.index)
                |
                set(browsing_scores.index)
            )

            cf_scores = cf_scores.reindex(
                all_products,
                fill_value=0
            )

            browsing_scores = browsing_scores.reindex(
                all_products,
                fill_value=0
            )

            hybrid_scores = (
                CF_WEIGHT * cf_scores
                +
                BROWSING_WEIGHT * browsing_scores
            )

            recommendations = (
                hybrid_scores
                .sort_values(ascending=False)
                .head(n)
            )

            return [
                {
                    "product": product,
                    "score": float(score)
                }
                for product, score in recommendations.items()
            ]


    # --------------------------------------------------------
    # CASE 2: NEW CUSTOMER WITH BROWSING HISTORY
    # --------------------------------------------------------

    if len(browsing_categories) > 0:

        recommendations = cold_start_browsing_recommend(
            browsing_categories,
            n=n
        )

        return [
            {
                "product": product,
                "score": float(score)
            }
            for product, score in recommendations.items()
        ]


    # --------------------------------------------------------
    # CASE 3: COMPLETELY NEW CUSTOMER
    # --------------------------------------------------------

    recommendations = (
        product_popularity
        .head(n)
    )

    return [
        {
            "product": product,
            "score": float(score)
        }
        for product, score in recommendations.items()
    ]
