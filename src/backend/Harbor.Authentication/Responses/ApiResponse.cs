namespace Harbor.Authentication.Responses
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
    }
    
    public class ApiResponse
    {
        public bool Success { get; set; } = true;
        public object? Data { get; set; }
    }
}
