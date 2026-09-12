namespace Harbor.Project.DTOs
{
    /// <summary>
    /// Represents a project as returned by the API.
    /// </summary>
    public class ProjectResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public int OwnerId { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>Whether the project has been archived.</summary>
        public bool IsArchived { get; set; }

        /// <summary>UTC timestamp of the most recent update, if any.</summary>
        public DateTime? UpdatedAt { get; set; }
    }
}