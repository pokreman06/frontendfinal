# Web Search & Page Fetching Features

## Overview
Added two new AI-accessible tools for enhanced research and information gathering capabilities.

## New Tools

### 1. Web Search with File Type Filtering (`web_search`)

**Capabilities:**
- Searches the web using Google Custom Search API
- Supports file type filtering (PDF, DOC, PPT, XLS, etc.)
- Returns list of relevant URLs

**Usage Examples:**

```
ACTION: web_search
PARAMETERS:
query=machine learning tutorials
EXPLANATION: Searching for machine learning tutorials.
```

```
ACTION: web_search
PARAMETERS:
query=annual report 2024
file_type=pdf
EXPLANATION: Searching for 2024 annual reports in PDF format.
```

**Supported File Types:**
- `pdf` - PDF documents
- `doc` / `docx` - Word documents
- `ppt` / `pptx` - PowerPoint presentations
- `xls` / `xlsx` - Excel spreadsheets
- Any other file extension Google supports

**Implementation:**
- Modified `PromptSearcher.GetQuery()` to accept optional `fileType` parameter
- Uses Google shorthand: `filetype:pdf` appended to query
- Available in both direct ACTION commands and AI-generated tool calls

### 2. Webpage Content Fetcher (`fetch_page`)

**Capabilities:**
- Fetches and parses HTML content from any webpage
- Extracts clean text content (removes scripts, styles, ads)
- Returns structured, readable text for AI analysis
- Limits content to 10,000 characters to prevent token overflow
- 10-second timeout for reliability

**Usage Example:**

```
ACTION: fetch_page
PARAMETERS:
url=https://example.com/article
EXPLANATION: Fetching and parsing the article content.
```

**Use Cases:**
- Reading search results to find specific information
- Extracting article content for summarization
- Analyzing webpage text for research
- Following up on web_search results

**Implementation:**
- New `WebPageFetcher` service using HtmlAgilityPack
- Registered as scoped service in DI container
- Handles errors gracefully with timeout and exception handling

## Technical Details

### File Type Search Query Transformation
```csharp
// Input: query="annual report", fileType="pdf"
// Output: "annual report filetype:pdf"
```

### HTML Parsing Process
1. HTTP request with proper User-Agent header
2. Load HTML into HtmlDocument
3. Remove `<script>` and `<style>` tags
4. Extract text content
5. Clean whitespace and normalize formatting
6. Truncate to 10,000 characters if needed

### Integration Points

**AgentController.cs:**
- Added `WebPageFetcher` dependency injection
- Updated system message with new tools
- Handles both direct ACTION and AI-generated tool calls
- Executes locally (not via MCP service)

**Program.cs:**
- Registered `WebPageFetcher` as scoped service
- Uses existing `IHttpClientFactory` for HTTP requests

**Dependencies:**
- `HtmlAgilityPack` v1.12.4 (NuGet package)

## Testing

### Test Web Search with File Type:
```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "ACTION: web_search\nPARAMETERS:\nquery=climate change report\nfile_type=pdf\nEXPLANATION: Searching for climate change reports in PDF format."
  }'
```

### Test Page Fetching:
```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "ACTION: fetch_page\nPARAMETERS:\nurl=https://en.wikipedia.org/wiki/Artificial_intelligence\nEXPLANATION: Fetching Wikipedia article on AI."
  }'
```

### Test Combined Workflow:
Ask the AI: "Search for recent AI research papers in PDF format and summarize the first result"

Expected behavior:
1. AI uses `web_search` with `file_type=pdf`
2. AI uses `fetch_page` on the first URL (if HTML landing page)
3. AI provides summary based on content

## Production Considerations

### Environment Variables
No new environment variables required. Uses existing:
- `GOOGLE_API` - Google Custom Search API key
- `CUSTOM_SEARCH_ENGINE` - Custom Search Engine ID

### Rate Limiting
- Google Custom Search API: 100 queries/day (free tier)
- Consider implementing caching for frequently searched terms
- Page fetching has 10-second timeout per request

### Security
- WebPageFetcher includes proper User-Agent header
- Timeout prevents hanging on slow servers
- Content truncation prevents memory issues
- Error handling prevents sensitive error exposure

### Performance
- Web search: ~100-500ms (Google API latency)
- Page fetching: ~500-5000ms (depends on target server)
- Both run locally (no MCP service overhead)

## Future Enhancements

**Potential additions:**
1. **Caching layer** - Cache search results and page content
2. **Screenshot capability** - Capture webpage screenshots for visual content
3. **Advanced parsing** - Extract specific elements (tables, lists, metadata)
4. **Bulk operations** - Fetch multiple pages in parallel
5. **Content type detection** - Handle PDFs, images, etc. directly
6. **Search result ranking** - Use custom ranking algorithms
7. **Rate limit handling** - Automatic retry with backoff
