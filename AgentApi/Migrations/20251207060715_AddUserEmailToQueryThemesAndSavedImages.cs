using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgentApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEmailToQueryThemesAndSavedImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserEmail",
                table: "saved_images",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserEmail",
                table: "query_themes",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserEmail",
                table: "saved_images");

            migrationBuilder.DropColumn(
                name: "UserEmail",
                table: "query_themes");
        }
    }
}
