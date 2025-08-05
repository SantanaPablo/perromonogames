// MiJuegosWeb.Server/Data/ApplicationDbContext.cs
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models; // ¡Importante! Aquí se usan tus modelos del proyecto Domain

namespace MiJuegosWeb.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        // Aquí defines tus DbSet para cada entidad del dominio
        public DbSet<User> Users { get; set; }
        public DbSet<Club> Clubs { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<GameWord> GameWords { get; set; }
        public DbSet<WordGuessGameResult> WordGuessGameResults { get; set; }
        public DbSet<IndividualGameRanking> IndividualGameRankings { get; set; }
        public DbSet<ClubGameRanking> ClubGameRankings { get; set; }
        public DbSet<DictionaryWord> DictionaryWords { get; set; }
        public DbSet<GamePin> GamePins { get; set; }
        public DbSet<PinGuessGameResult> PinGuessGameResults { get; set; }
        public DbSet<HangmanGameResult> HangmanGuessGameResults { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 🔠 Forzar nombres de tabla en minúsculas (MySQL en Linux es case-sensitive)
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<Club>().ToTable("clubs");
            modelBuilder.Entity<Game>().ToTable("games");
            modelBuilder.Entity<GameWord>().ToTable("gamewords");
            modelBuilder.Entity<WordGuessGameResult>().ToTable("wordguessgameresults");
            modelBuilder.Entity<IndividualGameRanking>().ToTable("individualgamerankings");
            modelBuilder.Entity<ClubGameRanking>().ToTable("clubgamerankings");
            modelBuilder.Entity<DictionaryWord>().ToTable("dictionarywords");
            modelBuilder.Entity<GamePin>().ToTable("gamepins");
            modelBuilder.Entity<PinGuessGameResult>().ToTable("pinguessgameresults");
            modelBuilder.Entity<HangmanGameResult>().ToTable("hangmanguessgameresults");

            // 🔑 Claves compuestas
            modelBuilder.Entity<IndividualGameRanking>()
                .HasKey(igr => new { igr.UserId, igr.GameId });

            modelBuilder.Entity<ClubGameRanking>()
                .HasKey(cgr => new { cgr.ClubId, cgr.GameId });

            // 🔗 Relaciones
            modelBuilder.Entity<User>()
                .HasOne(u => u.Club)
                .WithMany(c => c.Members)
                .HasForeignKey(u => u.ClubId)
                .IsRequired(false);

            modelBuilder.Entity<WordGuessGameResult>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId);

            modelBuilder.Entity<WordGuessGameResult>()
                .HasOne(r => r.GameWord)
                .WithMany()
                .HasForeignKey(r => r.GameWordId);
        }
    }
}