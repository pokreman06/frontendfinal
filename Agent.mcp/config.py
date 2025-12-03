import os
from dotenv import load_dotenv

load_dotenv()

# Facebook Graph API setup
GRAPH_API_VERSION = "v22.0"
# Support both naming conventions for backward compatibility
PAGE_ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN") or os.getenv("FACEBOOK_ACCESS_TOKEN")
PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
GRAPH_API_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
