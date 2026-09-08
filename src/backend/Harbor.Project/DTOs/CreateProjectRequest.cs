namespace Harbor.Project.DTOs
{
    /// <summary>
    /// Payload for creating a new project.
    /// </summary>
    public class CreateProjectRequest
    {
        /// <summary>Project name. Required, 3-100 characters, unique per owner.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Optional free-text description, up to 500 characters.</summary>
        public string? Description { get; set; }

        /// <summary>Optional link to the project's source repository.</summary>
        public string? RepositoryUrl { get; set; }
    }
}