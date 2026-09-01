using Npgsql;

namespace Harbor.ApiGateway.Data
{
    public class DbConnectionFactory
    {
        private readonly string _connectionString;

        public DbConnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("HarborDb")!;
        }

        public NpgsqlConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }
    }
}