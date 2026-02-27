using Backend.Security;

namespace Backend.Middleware;

public class TokenIntrospectionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TokenIntrospectionMiddleware> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public TokenIntrospectionMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        ILogger<TokenIntrospectionMiddleware> logger,
        IHttpClientFactory httpClientFactory)
    {
        _next = next;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only verify if user is authenticated via JWT first
        if (context.User.Identity?.IsAuthenticated == true)
        {
            // Extract the access token
            var token = context.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            
            if (!string.IsNullOrEmpty(token))
            {
                var isValid = await IntrospectTokenAsync(token);
                if (!isValid)
                {
                    _logger.LogWarning("Token introspection failed - Token revoked or invalid");
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Token revoked/active:false");
                    return;
                }
            }
        }

        await _next(context);
    }

    private async Task<bool> IntrospectTokenAsync(string token)
    {
        try 
        {
            // Call Zitadel Introspection Endpoint
            // Using "Basic Auth" with Service User Client ID & Secret is recommended for Introspection
            // Or JWT Profile
            // Here we assume simple introspection call
            
            var client = _httpClientFactory.CreateClient();
            var discoveryUrl = "http://localhost:8080/.well-known/openid-configuration"; 
            
            // Note: In real production, cache the introspection endpoint URL
            
            var request = new HttpRequestMessage(HttpMethod.Post, "http://localhost:8080/oauth/v2/introspect");
            
            // Basic Auth with API Resource Client ID/Secret is usually required here
            // For now, let's try sending token_type_hint
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("token", token),
                new KeyValuePair<string, string>("token_type_hint", "access_token"),
                // Add client_id/client_secret if Reference Token is used or strictly enforced
                new KeyValuePair<string, string>("client_id", "358254262054092803"), 
                new KeyValuePair<string, string>("client_secret", "") // Public client usually has no secret
            });

            request.Content = content;
            var response = await client.SendAsync(request);
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadFromJsonAsync<IntrospectionResponse>();
                return json?.Active == true;
            }
             
            return false;
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "Introspection error");
             return false;
        }
    }
    
    private class IntrospectionResponse
    {
        public bool Active { get; set; }
    }
}
