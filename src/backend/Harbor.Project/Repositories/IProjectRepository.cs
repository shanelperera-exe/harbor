using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public interface IProjectRepository
    {
        Task<int> CreateAsync(ProjectEntity project);
        Task<bool> NameExistsForOwnerAsync(string name, int ownerId);
        Task<List<ProjectEntity>> GetByOwnerAsync(int ownerId);
        Task<List<ProjectEntity>> GetAllAsync();
    }
}