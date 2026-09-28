using System.Net;
using System.Text;

namespace Harbor.Project.Tests
{
    /// <summary>
    /// Minimal fake <see cref="HttpMessageHandler"/> that returns a canned response and
    /// records the request that was sent, so HttpClient-backed services can be tested
    /// without touching the network.
    /// </summary>
    public sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _body;

        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastRequestBody { get; private set; }
        public int CallCount { get; private set; }

        public FakeHttpMessageHandler(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            _statusCode = statusCode;
            _body = body;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequest = request;

            if (request.Content != null)
                LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);

            // A fresh content instance per call: callers dispose the response, and a
            // reused StringContent would already be disposed on the second request.
            return new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_body, Encoding.UTF8, "application/json")
            };
        }
    }
}
