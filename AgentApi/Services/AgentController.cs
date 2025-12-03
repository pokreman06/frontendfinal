using Google.Apis.CustomSearchAPI.v1;
using Google.Apis.Services;
namespace AgentApi.Services.SearchValidation;
public class PromptSearcher(string key, string id)
{
    public bool hasToken()
    {
        return !string.IsNullOrEmpty(key) && !string.IsNullOrEmpty(id);
    }
    
    public async Task<List<string>> GetQuery(string query, string? fileType = null)
    {
        // Add file type filter if specified (e.g., pdf, doc, ppt, xls)
        if (!string.IsNullOrEmpty(fileType))
        {
            query = $"{query} filetype:{fileType}";
        }
        
        var customSearchService = new CustomSearchAPIService(new
         BaseClientService.Initializer{
            ApiKey = key
         });
         var listRequest = customSearchService.Cse.List();
         listRequest.Cx = id;
         listRequest.Q = query;
         var results = new List<string>();
         var search = await listRequest.ExecuteAsync();
         if (search.Items != null)
            {
                foreach (var result in search.Items)
            {
             results.Add(result.Link);
            }
        }
        return results;
    }
}