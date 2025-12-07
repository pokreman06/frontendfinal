using System.Text;
using HtmlAgilityPack;

namespace AgentApi.Services;

public class WebPageFetcher
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebPageFetcher> _logger;

    public WebPageFetcher(IHttpClientFactory httpClientFactory, ILogger<WebPageFetcher> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<string> FetchPageContent(string url)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var html = await response.Content.ReadAsStringAsync();

            // Parse HTML and extract text content
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Remove script and style elements
            doc.DocumentNode.Descendants()
                .Where(n => n.Name == "script" || n.Name == "style")
                .ToList()
                .ForEach(n => n.Remove());

            // Get text content
            var textContent = doc.DocumentNode.InnerText;

            // Clean up whitespace
            var lines = textContent
                .Split('\n')
                .Select(line => line.Trim())
                .Where(line => !string.IsNullOrWhiteSpace(line));

            var cleanedText = string.Join("\n", lines);

            // Limit to reasonable size (first 10000 characters)
            if (cleanedText.Length > 10000)
            {
                cleanedText = cleanedText.Substring(0, 10000) + "\n... [content truncated]";
            }

            return cleanedText;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching page content from {Url}", url);
            return $"Error fetching page: {ex.Message}";
        }
    }
}
