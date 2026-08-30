using Microsoft.AspNetCore.Mvc;
using Harbor.ApiGateway.Data;

namespace Harbor.ApiGateway.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly DbConnectionFactory _dbFactory;

        public HealthController(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        [HttpGet("db")]
        public IActionResult CheckDatabase()
        {
            using var connection = _dbFactory.CreateConnection();
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1";
            var result = command.ExecuteScalar();

            return Ok(new { status = "connected", result });
        }
    }
}