namespace Harbor.Project.DTOs
{
    /// <summary>
    /// A project as returned by the API.
    /// </summary>
    public class ProjectResponse
    {
        /// <summary>Unique project identifier.</summary>
        public int Id { get; set; }

        /// <summary>Project name.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Optional description.</summary>
        public string? Description { get; set; }

        /// <summary>Optional link to the project's source repository.</summary>
        public string? RepositoryUrl { get; set; }

        /// <summary>User id of the project's owner.</summary>
        public int OwnerId { get; set; }

        /// <summary>UTC timestamp of when the project was created.</summary>
        public DateTime CreatedAt { get; set; }
    }
}