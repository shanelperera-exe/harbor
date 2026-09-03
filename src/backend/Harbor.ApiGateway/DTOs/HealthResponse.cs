namespace Harbor.ApiGateway.DTOs
{
    public class HealthResponse
    {
        public string Status { get; set; } = string.Empty;
        public object? Result { get; set; }
    }
}
