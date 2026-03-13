import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# BytePlus ModelArk
MODELARK_API_KEY = os.environ.get("MODELARK_API_KEY", "")
MODELARK_BASE_URL = os.environ.get("MODELARK_BASE_URL", "https://ark.ap-southeast.bytepluses.com/api/v3")
_raw_model_id = os.environ.get("MODELARK_MODEL_ID", "").strip()
MODELARK_MODEL_ID = _raw_model_id if _raw_model_id and not _raw_model_id.startswith("#") else "deepseek-v3-1-250821"
USE_MOCK_LLM = os.environ.get("USE_MOCK_LLM", "false").lower() == "true"

# ModelArk client (OpenAI-compatible)
# Only create if API key is set, model ID looks valid (starts with ep- or is a known model), and mock is off
modelark_client: AsyncOpenAI | None = None
_model_looks_valid = MODELARK_MODEL_ID.startswith("ep-") or MODELARK_MODEL_ID.startswith("deepseek") or MODELARK_MODEL_ID.startswith("doubao")
if MODELARK_API_KEY and not USE_MOCK_LLM and _model_looks_valid:
    modelark_client = AsyncOpenAI(
        api_key=MODELARK_API_KEY,
        base_url=MODELARK_BASE_URL,
        timeout=5.0,
        max_retries=0,
    )

# Database
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/supplymind")

# BytePlus VikingDB
VIKINGDB_HOST = os.environ.get("VIKINGDB_HOST", "")
VIKINGDB_REGION = os.environ.get("VIKINGDB_REGION", "ap-southeast-1")
VIKINGDB_AK = os.environ.get("VIKINGDB_AK", "")
VIKINGDB_SK = os.environ.get("VIKINGDB_SK", "")

# Feature flags
USE_MOCK_SEARCH = os.environ.get("USE_MOCK_SEARCH", "true").lower() == "true"
USE_MOCK_VIKINGDB = os.environ.get("USE_MOCK_VIKINGDB", "true").lower() == "true"

# App
FLASK_PORT = int(os.environ.get("FLASK_PORT", 5000))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
