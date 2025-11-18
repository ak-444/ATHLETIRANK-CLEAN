-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: athletirank_db
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bracket_id` int NOT NULL,
  `source_match_id` int DEFAULT NULL,
  `round_number` int NOT NULL,
  `team1_id` int DEFAULT NULL,
  `team2_id` int DEFAULT NULL,
  `winner_id` int DEFAULT NULL,
  `mvp_id` int DEFAULT NULL,
  `score_team1` int DEFAULT '0',
  `score_team2` int DEFAULT '0',
  `set_scores` json DEFAULT NULL,
  `status` enum('scheduled','ongoing','completed','hidden','bye') DEFAULT 'scheduled',
  `scheduled_at` datetime DEFAULT NULL,
  `match_order` int NOT NULL DEFAULT '0',
  `bracket_type` enum('winner','loser','championship','round_robin') DEFAULT 'winner',
  `display_order` int DEFAULT '0',
  `overtime_periods` int DEFAULT '0',
  `last_updated_by` varchar(255) DEFAULT NULL,
  `last_updated_at` timestamp NULL DEFAULT NULL,
  `last_updated_role` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bracket_id` (`bracket_id`),
  KEY `team1_id` (`team1_id`),
  KEY `winner_id` (`winner_id`),
  KEY `mvp_id` (`mvp_id`),
  KEY `matches_ibfk_3` (`team2_id`),
  KEY `fk_source_match` (`source_match_id`),
  KEY `idx_matches_last_updated` (`last_updated_at`),
  CONSTRAINT `fk_source_match` FOREIGN KEY (`source_match_id`) REFERENCES `matches` (`id`),
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`bracket_id`) REFERENCES `brackets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`team1_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`team2_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`winner_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `matches_ibfk_5` FOREIGN KEY (`mvp_id`) REFERENCES `players` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2617 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (2611,364,NULL,1,69,67,69,NULL,6,NULL,NULL,'completed',NULL,0,'winner',0,0,'sss','2025-11-18 11:03:39','sports_committee'),(2612,364,NULL,1,66,68,NULL,NULL,0,0,NULL,'scheduled',NULL,0,'winner',0,0,NULL,NULL,NULL),(2613,364,NULL,2,69,NULL,NULL,NULL,0,0,NULL,'scheduled',NULL,0,'winner',0,0,NULL,NULL,NULL),(2614,365,NULL,1,65,71,65,NULL,3,NULL,NULL,'completed',NULL,0,'winner',0,0,'sss','2025-11-18 11:04:35','sports_committee'),(2615,365,NULL,1,70,72,NULL,NULL,0,0,NULL,'scheduled',NULL,0,'winner',0,0,NULL,NULL,NULL),(2616,365,NULL,2,65,NULL,NULL,NULL,0,0,NULL,'scheduled',NULL,0,'winner',0,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-18 19:33:43
