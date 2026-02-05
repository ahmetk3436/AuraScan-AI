package database

import (
	"fmt"
	"log"

	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/aurasnap/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Ping() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

func InitDB(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// AutoMigrate schemas
	err = db.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Subscription{},
		&models.Block{},
		&models.Report{},
		&models.AuraReading{},
		&models.AuraMatch{},
		&models.AuraStreak{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected and migrated successfully")
	DB = db
	return db
}