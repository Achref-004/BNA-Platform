#!/usr/bin/env python3
# ============================================================
# train_and_predict.py — Script CLI appelé par Node.js (Express)
# ------------------------------------------------------------
# Usage :
#   python train_and_predict.py --input ../data/input.csv --output-dir ../outputs
#
# Code de sortie :
#   0 = succès
#   1 = erreur (détails dans stderr + training_log.txt)
# ============================================================
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# Permet les imports relatifs depuis le dossier ml-forecast
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from pipeline import run_full_pipeline  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("forecast.cli")


def main() -> int:
    parser = argparse.ArgumentParser(description="Pipeline AI Forecasting BNA")
    parser.add_argument("--input", required=True, help="Chemin CSV ou Excel source")
    parser.add_argument("--output-dir", required=True, help="Dossier de sortie des résultats")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)

    if not input_path.exists():
        logger.error("Fichier introuvable : %s", input_path)
        return 1

    try:
        summary = run_full_pipeline(input_path, output_dir)
        print(json.dumps({"ok": True, "best_model": summary.get("best_model")}, ensure_ascii=False))
        return 0
    except Exception as exc:
        logger.exception("Pipeline échoué")
        output_dir.mkdir(parents=True, exist_ok=True)
        err_payload = {"status": "error", "error": str(exc)}
        (output_dir / "results_summary.json").write_text(
            json.dumps(err_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps(err_payload, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
