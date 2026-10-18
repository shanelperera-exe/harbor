using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using Harbor.Project.Data;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public class ServiceDomainRepository : IServiceDomainRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public ServiceDomainRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<int> CreateAsync(ServiceDomainEntity domain)
        {
            const string sql = @"
                INSERT INTO ""ServiceDomains"" 
                (""ServiceId"", ""Domain"", ""Environment"", ""IsPrimary"", ""IsSystem"", ""Status"", ""DnsType"", ""DnsHost"", ""DnsTarget"", ""CreatedAt"")
                VALUES 
                (@ServiceId, @Domain, @Environment, @IsPrimary, @IsSystem, @Status, @DnsType, @DnsHost, @DnsTarget, @CreatedAt)
                RETURNING ""Id"";";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteScalarAsync<int>(sql, domain);
        }

        public async Task<List<ServiceDomainEntity>> GetByServiceIdAsync(int serviceId)
        {
            const string sql = @"
                SELECT ""Id"", ""ServiceId"", ""Domain"", ""Environment"", ""IsPrimary"", ""IsSystem"", ""Status"", ""DnsType"", ""DnsHost"", ""DnsTarget"", ""CreatedAt"", ""VerifiedAt""
                FROM ""ServiceDomains""
                WHERE ""ServiceId"" = @ServiceId
                ORDER BY ""IsPrimary"" DESC, ""CreatedAt"" ASC;";

            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryAsync<ServiceDomainEntity>(sql, new { ServiceId = serviceId });
            return result.AsList();
        }

        public async Task<ServiceDomainEntity?> GetByIdAsync(int id)
        {
            const string sql = @"
                SELECT ""Id"", ""ServiceId"", ""Domain"", ""Environment"", ""IsPrimary"", ""IsSystem"", ""Status"", ""DnsType"", ""DnsHost"", ""DnsTarget"", ""CreatedAt"", ""VerifiedAt""
                FROM ""ServiceDomains""
                WHERE ""Id"" = @Id;";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<ServiceDomainEntity>(sql, new { Id = id });
        }

        public async Task<ServiceDomainEntity?> GetByDomainAsync(int serviceId, string domain)
        {
            const string sql = @"
                SELECT ""Id"", ""ServiceId"", ""Domain"", ""Environment"", ""IsPrimary"", ""IsSystem"", ""Status"", ""DnsType"", ""DnsHost"", ""DnsTarget"", ""CreatedAt"", ""VerifiedAt""
                FROM ""ServiceDomains""
                WHERE ""ServiceId"" = @ServiceId AND LOWER(""Domain"") = LOWER(@Domain);";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<ServiceDomainEntity>(sql, new { ServiceId = serviceId, Domain = domain });
        }

        public async Task<bool> DeleteAsync(int id)
        {
            const string sql = @"DELETE FROM ""ServiceDomains"" WHERE ""Id"" = @Id;";

            using var connection = _connectionFactory.CreateConnection();
            var rows = await connection.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }

        public async Task<bool> SetPrimaryAsync(int serviceId, int domainId)
        {
            await using var connection = _connectionFactory.CreateConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            await using var transaction = await connection.BeginTransactionAsync();
            try
            {
                // Reset all for service
                await connection.ExecuteAsync(
                    @"UPDATE ""ServiceDomains"" SET ""IsPrimary"" = FALSE WHERE ""ServiceId"" = @ServiceId;",
                    new { ServiceId = serviceId },
                    transaction);

                // Set selected domain as primary
                var rows = await connection.ExecuteAsync(
                    @"UPDATE ""ServiceDomains"" SET ""IsPrimary"" = TRUE WHERE ""Id"" = @DomainId AND ""ServiceId"" = @ServiceId;",
                    new { DomainId = domainId, ServiceId = serviceId },
                    transaction);

                await transaction.CommitAsync();
                return rows > 0;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> UpdateStatusAsync(int id, string status, DateTime? verifiedAt)
        {
            const string sql = @"
                UPDATE ""ServiceDomains""
                SET ""Status"" = @Status, ""VerifiedAt"" = @VerifiedAt
                WHERE ""Id"" = @Id;";

            using var connection = _connectionFactory.CreateConnection();
            var rows = await connection.ExecuteAsync(sql, new { Id = id, Status = status, VerifiedAt = verifiedAt });
            return rows > 0;
        }

        public async Task<List<Harbor.Project.DTOs.AdminDomainDto>> GetAllAdminDomainsAsync()
        {
            const string sql = @"
                SELECT 
                    sd.""Id""::text AS ""Id"",
                    sd.""Domain"" AS ""DomainName"",
                    COALESCE(p.""Name"", 'Default Project') AS ""ProjectName"",
                    COALESCE(p.""Id"", 0) AS ""ProjectId"",
                    COALESCE(s.""Name"", 'Default Service') AS ""ServiceName"",
                    sd.""ServiceId"" AS ""ServiceId"",
                    COALESCE(sd.""Environment"", 'Production') AS ""Environment"",
                    CASE 
                        WHEN LOWER(sd.""Status"") = 'active' THEN 'issued'
                        WHEN LOWER(sd.""Status"") = 'failed' THEN 'failed'
                        ELSE 'pending_validation'
                    END AS ""SslStatus"",
                    CASE 
                        WHEN LOWER(sd.""Status"") = 'active' THEN 'verified'
                        WHEN LOWER(sd.""Status"") = 'failed' THEN 'cname_missing'
                        ELSE 'unverified'
                    END AS ""DnsStatus"",
                    COALESCE(sd.""DnsTarget"", 'cname.ingress.harbor.local') AS ""CnameTarget"",
                    sd.""CreatedAt"" AS ""CreatedAt"",
                    COALESCE(sd.""VerifiedAt"", sd.""CreatedAt"") AS ""LastChecked""
                FROM ""ServiceDomains"" sd
                LEFT JOIN ""Services"" s ON sd.""ServiceId"" = s.""Id""
                LEFT JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id""
                ORDER BY sd.""CreatedAt"" DESC;";

            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryAsync<Harbor.Project.DTOs.AdminDomainDto>(sql);
            return result.AsList();
        }
    }
}
