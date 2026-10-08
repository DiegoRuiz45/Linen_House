import re
import unicodedata


def slugify(value: str) -> str:

    normalized = unicodedata.normalize(
        "NFKD",
        value,
    )

    normalized = (
        normalized
        .encode(
            "ascii",
            "ignore",
        )
        .decode("ascii")
    )

    normalized = (
        normalized
        .lower()
        .strip()
    )

    normalized = re.sub(
        r"[^a-z0-9]+",
        "-",
        normalized,
    )

    return normalized.strip("-")