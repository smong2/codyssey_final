#!/usr/bin/env bash
set -euo pipefail

python -m pip install -r backend/api/requirements.txt
python backend/database/sqlite/seed_dialogue_content.py --migrate --version dev-dialogue-v1
python backend/database/sqlite/seed_npc_story.py --migrate --version dev-dialogue-v1
python backend/database/sqlite/seed_location_story_master.py --migrate --version dev-dialogue-v1
python backend/database/sqlite/seed_activities.py --version dev-dialogue-v1
python backend/database/sqlite/seed_pet_dialogues.py --version dev-dialogue-v1
