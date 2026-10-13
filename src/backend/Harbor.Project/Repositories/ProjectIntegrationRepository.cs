using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using Harbor.Project.Data;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public class ProjectIntegrationRepository : IProjectIntegrationRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public ProjectIntegrationRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<int> CreateAsync(ProjectIntegrationEntity integration)
        {
            const string sql = @"
                INSERT INTO project_integrations (project_id, provider_type, name, provider_token)
                VALUES (@ProjectId, @ProviderType, @Name, @ProviderToken)
                RETURNING id;";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteScalarAsync<int>(sql, integration);
        }

        public async Task<List<ProjectIntegrationEntity>> GetByProjectIdAsync(int projectId)
        {
            const string sql = @"
                SELECT id as Id,
                       project_id as ProjectId,
                       provider_type as ProviderType,
                       name as Name,
                       provider_token as ProviderToken,
                       created_at as CreatedAt
                FROM project_integrations
                WHERE project_id = @ProjectId
                ORDER BY created_at DESC;";

            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryAsync<ProjectIntegrationEntity>(sql, new { ProjectId = projectId });
            return result.AsList();
        }

        public async Task<ProjectIntegrationEntity?> GetByIdAsync(int id)
        {
            const string sql = @"
                SELECT id as Id,
                       project_id as ProjectId,
                       provider_type as ProviderType,
                       name as Name,
                       provider_token as ProviderToken,
                       created_at as CreatedAt
                FROM project_integrations
                WHERE id = @Id;";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<ProjectIntegrationEntity>(sql, new { Id = id });
        }

        public async Task<bool> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM project_integrations WHERE id = @Id;";
            using var connection = _connectionFactory.CreateConnection();
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }
    }
}
