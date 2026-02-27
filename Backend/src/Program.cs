using Backend.Services;
using Backend.Security;
using Backend.Middleware;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography.X509Certificates;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddHttpClient(); // Add HttpClientFactory

// Configure HttpClient to accept self-signed certificates (for WSO2 JWKS endpoint)
builder.Services.AddHttpClient("JwtBearer")
    .ConfigurePrimaryHttpMessageHandler(() =>
    {
        return new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
        };
    });

builder.Services.AddMemoryCache();
// SignalR removed - using Front-Channel Logout instead
builder.Services.AddSingleton<ITokenRevocationService, TokenRevocationService>();

builder.Services.AddGrpc(options => 
{
    options.EnableDetailedErrors = true;
});
builder.Services.AddControllers();

builder.Services.AddAuthorization();

// Add CORS for gRPC-Web
builder.Services.AddCors(o => o.AddPolicy("AllowAll", builder =>
{
    builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader()
        .WithExposedHeaders("grpc-status", "grpc-message", "grpc-encoding", "grpc-accept-encoding");
}));

// Manually fetch JWKS from WSO2 at startup
var httpClientHandler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
};
var httpClient = new HttpClient(httpClientHandler);
var jwksUri = "https://localhost:9443/t/carbon.super/oauth2/jwks";

//logger
using var loggerFactory = LoggerFactory.Create(loggingBuilder =>
{
    loggingBuilder.AddConsole();
});
var logger = loggerFactory.CreateLogger("Startup");

logger.LogInformation("Fetching JWKS from: {JwksUri}", jwksUri);
var jwksJson = await httpClient.GetStringAsync(jwksUri);
logger.LogInformation("JWKS fetched successfully: {Preview}...", jwksJson.Substring(0, Math.Min(100, jwksJson.Length)));

var jwks = new Microsoft.IdentityModel.Tokens.JsonWebKeySet(jwksJson);
var signingKeys = jwks.GetSigningKeys().ToList();
logger.LogInformation("Loaded {Count} signing keys from JWKS", signingKeys.Count);

// Filter out expired X509 keys and log warnings
var validKeys = new List<Microsoft.IdentityModel.Tokens.SecurityKey>();
foreach (var key in signingKeys)
{
    if (key is Microsoft.IdentityModel.Tokens.X509SecurityKey x509Key)
    {
        if (x509Key.Certificate.NotAfter < DateTime.UtcNow)
        {
            logger.LogWarning("Skipping expired certificate: NotAfter={NotAfter:yyyy-MM-dd HH:mm:ss} UTC", x509Key.Certificate.NotAfter);
            logger.LogWarning("Using expired certificate for DEV ONLY - DO NOT USE IN PRODUCTION!");
            // For dev: still use expired cert but create new key without validation
            var rsa = x509Key.Certificate.GetRSAPublicKey();
            if (rsa != null)
            {
                validKeys.Add(new Microsoft.IdentityModel.Tokens.RsaSecurityKey(rsa) 
                { 
                    KeyId = x509Key.KeyId 
                });
                logger.LogInformation("Created RSA key from expired cert (DEV ONLY): KeyId={KeyId}", x509Key.KeyId);
            }
        }
        else
        {
            validKeys.Add(key);
            logger.LogInformation("Valid certificate: NotAfter={NotAfter:yyyy-MM-dd HH:mm:ss} UTC", x509Key.Certificate.NotAfter);
        }
    }
    else
    {
        validKeys.Add(key);
    }
}

logger.LogInformation("Final signing keys count: {Count}", validKeys.Count);

// Register signing keys as singleton for LogoutTokenValidator
builder.Services.AddSingleton<IEnumerable<Microsoft.IdentityModel.Tokens.SecurityKey>>(validKeys);

// Register LogoutTokenValidator
builder.Services.AddScoped<ILogoutTokenValidator, LogoutTokenValidator>();

// Disable default claim type mapping (sub -> nameidentifier, etc.)
System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        // Disable claim type mapping in JWT Bearer handler
        options.MapInboundClaims = false;
        
        // Use manually fetched signing keys
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateAudience = false, // Accept tokens from both App 1 and App 2
            ValidateIssuer = false, // WSO2 issuer can vary
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5),
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = validKeys,
            // Keep original claim names
            NameClaimType = "sub"
        };

        options.RequireHttpsMetadata = false;
        
        // Log validation events
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError("[JWT] Authentication failed: {ExceptionType} - {Message}", 
                    context.Exception.GetType().Name, context.Exception.Message);
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                var sub = context.Principal?.FindFirst("sub")?.Value;
                var username = context.Principal?.FindFirst("username")?.Value;
                logger.LogInformation("[JWT] Token validated successfully - User: {User}", username ?? sub);
                return Task.CompletedTask;
            }
        };
    });



builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5213); // HTTP
    
});
var app = builder.Build();



// Use routing and CORS first
app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication(); // Re-enabled with proper signature validation
app.UseMiddleware<TokenRevocationMiddleware>();
//app.UseMiddleware<TokenIntrospectionMiddleware>(); // Check Active Token
app.UseAuthorization();
// Enable gRPC-Web
app.UseGrpcWeb();


// Configure the HTTP request pipeline.
app.MapGet("/", () => "gRPC Server is running");

app.UseEmployeeServices(builder.Configuration, "v1");

// Front-Channel Logout is handled by FrontChannelLogoutController

app.Run();
