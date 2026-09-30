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
        private readonly Queue<(HttpStatusCode Status, string Body)>? _sequence;

        public FakeHttpMessageHandler(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            _statusCode = statusCode;
            _body = body;
        }

        /// <summary>
        /// Returns a different canned response per call, in order, so a service that makes
        /// several requests (such as a primary call followed by a fallback) can be tested.
        /// The last entry is reused once the queue is exhausted.
        /// </summary>
        private FakeHttpMessageHandler(IEnumerable<(HttpStatusCode Status, string Body)> sequence)
        {
            _sequence = new Queue<(HttpStatusCode, string)>(sequence);
            _statusCode = HttpStatusCode.OK;
            _body = string.Empty;
        }

        public static FakeHttpMessageHandler Sequence(params (HttpStatusCode Status, string Body)[] responses) =>
            new(responses);

        public List<Uri> RequestUris { get; } = new();

        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastRequestBody { get; private set; }
        public int CallCount { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequest = request;
            if (request.RequestUri != null)
                RequestUris.Add(request.RequestUri);

            if (request.Content != null)
                LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);

            var (status, body) = _sequence != null && _sequence.Count > 1
                ? _sequence.Dequeue()
                : _sequence != null && _sequence.Count == 1
                    ? _sequence.Peek()
                    : (_statusCode, _body);

            // A fresh content instance per call: callers dispose the response, and a
            // reused StringContent would already be disposed on the second request.
            return new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
        }
    }
}
