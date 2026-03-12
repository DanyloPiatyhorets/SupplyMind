import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# BytePlus ModelArk
MODELARK_API_KEY = os.environ.get("MODELARK_API_KEY", "")
MODELARK_BASE_URL = os.environ.get("MODELARK_BASE_URL", "https://ark.ap-southeast.bytepluses.com/api/v3")
MODELARK_MODEL_ID = os.environ.get("MODELARK_MODEL_ID", "deepseek-v3-1-250821")
USE_MOCK_LLM = os.environ.get("USE_MOCK_LLM", "false").lower() == "true"

# ModelArk client (OpenAI-compatible)
modelark_client: AsyncOpenAI | None = None
if MODELARK_API_KEY and not USE_MOCK_LLM:
    modelark_client = AsyncOpenAI(
        api_key=MODELARK_API_KEY,
        base_url=MODELARK_BASE_URL,
        timeout=30.0,
    )

# Database
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/supplymind")

# Feature flags
USE_MOCK_SEARCH = os.environ.get("USE_MOCK_SEARCH", "true").lower() == "true"
USE_MOCK_VIKINGDB = os.environ.get("USE_MOCK_VIKINGDB", "true").lower() == "true"

# App
FLASK_PORT = int(os.environ.get("FLASK_PORT", 5000))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
