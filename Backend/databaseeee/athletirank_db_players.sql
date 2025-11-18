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
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL,
  `jersey_number` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `players_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (482,65,'John Angelbert','Setter','12'),(483,65,'Alyssa Valdez','Setter','24'),(484,65,'Joe Mama','Setter','32'),(485,65,'Frank Ankolstein','Outside Hitter','5'),(486,65,'Pia Cruz','Outside Hitter','88'),(487,65,'Sofia Nicole','Opposite Hitter','34'),(488,65,'John Smith','Middle Blocker','68'),(490,65,'Angelo Villanueva','Outside Hitter','30'),(491,65,'Mark Salazar','Libero','8'),(492,65,'Francis Bautista','Libero','16'),(493,65,'Jemalu Per','Opposite Hitter','4'),(494,66,'Marcus Johnson','Point Guard','7'),(495,66,'Tyler Brooks','Point Guard','15'),(497,66,'Kevin Martinez','Shooting Guard','24'),(498,66,'James Rodriguez','Small Forward','3'),(500,66,'Michael Thompson','Power Forward','34'),(502,66,'David Anderson','Shooting Guard','12'),(503,66,'Robert Garcia','Center','55'),(505,66,'Daniele Moore','Shooting Guard','1'),(506,67,'Megumi Accorda','Point Guard','16'),(507,67,'Ruby Malone','Point Guard','44'),(508,67,'Scream Achk','Point Guard','23'),(509,67,'Stephen Kanto','Shooting Guard','50'),(510,67,'Charizard Fire','Shooting Guard','1'),(511,67,'Squirte Water','Shooting Guard','42'),(512,67,'Bul Basuar','Small Forward','33'),(513,67,'Snorlax Normal','Small Forward','32'),(514,67,'John Smith','Center','45'),(515,67,'Skusta Clee','Center','87'),(516,67,'Jhobart Masinop','Power Forward','77'),(517,67,'Loki Napanot','Power Forward','9'),(518,68,'Marco Dela Cruz','Point Guard','0'),(519,68,'Carlo Ramirez','Shooting Guard','3'),(520,68,'Nathan Uy','Small Forward','5'),(521,68,'Renz Villanueva','Power Forward','8'),(522,68,'Paolo Santos','Center','10'),(524,68,'Enzo Mendoza','Point Guard','12'),(526,68,'Jeric Ramos','Power Forward','14'),(527,68,'Kyle Reyes','Center','17'),(528,68,'Dennis Ong','Point Guard','19'),(529,68,'Leo Lim','Small Forward','21'),(530,68,'Francis Cortez','Shooting Guard','24'),(531,68,'Ivan Bautista','Power Forward','33'),(533,69,'Emil Robles','Shooting Guard','4'),(534,69,'Angelo Sy','Small Forward','6'),(535,69,'Patrick Chan','Power Forward','9'),(536,69,'Justin Rivera','Center','15'),(537,69,'Caleb Cruz','Shooting Guard','16'),(538,69,'Mark Villamor','Small Forward','18'),(539,69,'Ethan Co','Point Guard','20'),(540,69,'Paul David','Center','22'),(541,69,'Jonel Abad','Power Forward','23'),(542,69,'Aaron Lee','Shooting Guard','26'),(543,69,'Noel Estrada','Point Guard','28'),(544,69,'Julius Pineda','Small Forward','30'),(545,69,'Jen Ko','Shooting Guard','33'),(546,70,'Jasper Lim','Setter','2'),(547,70,'Ethan Dela Pena','Outside Hitter','3'),(548,70,'Marco Villanueva','Middle Blocker','4'),(549,70,'Ralph David','Opposite Hitter','5'),(550,70,'Carlo Tan','Libero','6'),(551,70,'Ivan Yu','Outside Hitter','7'),(552,70,'Justin Robles','Middle Blocker','8'),(553,70,'Ariel Gonzales','Setter','9'),(554,70,'Nelson Ramos','Opposite Hitter','10'),(555,70,'Lemuel Ponce','Libero','11'),(556,70,'Travis Ong','Outside Hitter','12'),(557,70,'Harold Bautista','Middle Blocker','13'),(558,70,'Nathan Cortez','Opposite Hitter','14'),(559,71,'Noel Pineda','Setter','1'),(560,71,'Bryan Torres','Libero','2'),(561,71,'Emil Co','Middle Blocker','3'),(562,71,'Adrian Fajardo','Opposite Hitter','4'),(563,71,'Marlon Sy','Libero','5'),(564,71,'Jeric Ramos','Outside Hitter','6'),(565,71,'Julius Manalo','Middle Blocker','7'),(566,71,'Carlo Diaz','Setter','8'),(567,71,'Vincent Ong','Opposite Hitter','9'),(568,71,'Randy Herrera','Libero','10'),(569,71,'Leo Mercado','Outside Hitter','11'),(570,71,'Miguel Tan','Middle Blocker','12'),(571,71,'Allen Go','Opposite Hitter','13'),(572,71,'Patrick Reyes','Setter','14'),(573,71,'Harvey Cruz','Outside Hitter','15'),(574,72,'Kevin Dizon','Outside Hitter','4'),(575,72,'Elmo Diaz','Opposite Hitter','7'),(576,72,'Raymond Cruz','Outside Hitter','8'),(577,72,'Tristan Alonzo','Opposite Hitter','11'),(578,72,'Patrick Roldan','Opposite Hitter','13'),(579,72,'Daniel Uy','Libero','16'),(580,72,'Carlo Ponce','Libero','18'),(581,72,'Mark Soriano','Libero','20'),(582,72,'Ryan Dela Pena','Defensive Specialist','23'),(583,72,'Leo Aquino','Setter','25'),(584,72,'Julius Ramos','Outside Hitter','28'),(585,72,'Lance Gutierrez','Setter','30'),(586,72,'Omar Villanueva','Setter','33'),(587,72,'Jeric Santos','Middle Blocker','36'),(588,72,'Enrico Vega','Middle Blocker','40'),(589,73,'Rico Mendoza','Setter','1'),(590,73,'Jayson Cruz','Outside Hitter','2'),(591,73,'Kevin Santos','Middle Blocker','3'),(592,73,'Paolo Dela Rosa','Opposite Hitter','4'),(593,73,'Randy Uy','Libero','5'),(594,73,'Jonel Tan','Outside Hitter','6'),(595,73,'Nico Ramirez','Middle Blocker','7'),(596,73,'Elmer Go','Setter','8'),(597,73,'Francis Ong','Opposite Hitter','9'),(598,73,'Bryan Lim','Libero','10'),(599,73,'Jerome Pineda','Outside Hitter','11'),(600,73,'Dennis Co','Middle Blocker','12'),(601,73,'Miguel Rivera','Opposite Hitter','13'),(602,73,'Lester Yao','Setter','14'),(603,74,'ques','Setter','12'),(604,74,'pasa','Setter','13'),(605,74,'ewq','Setter','11'),(606,74,'fdfa','Outside Hitter','32'),(607,74,'fdas','Outside Hitter','31'),(608,74,'sdaxd','Middle Blocker','30'),(609,74,'sfddx','Middle Blocker','19'),(610,74,'sads','Opposite Hitter','2'),(611,74,'gfgr','Opposite Hitter','3'),(612,74,'cvvdsd','Opposite Hitter','4'),(613,74,'sdqdsaxx','Libero','5'),(614,74,'sqwexczas','Defensive Specialist','7'),(615,75,'Chris Mercado','Point Guard','1'),(616,75,'Vince Aquino','Shooting Guard','5'),(617,75,'Arjay Navarro','Small Forward','7'),(618,75,'Cedric Balboa','Power Forward','11'),(619,75,'Lloyd Hernandez','Center','13'),(620,75,'Ian Torres','Shooting Guard','14'),(621,75,'Sean Morales','Point Guard','16'),(622,75,'Albert Ong','Small Forward','18'),(623,75,'Jerwin Flores','Power Forward','21'),(624,75,'Karl Sison','Center','25'),(625,75,'Luis Herrera','Shooting Guard','27'),(626,75,'Gilbert Pio','Small Forward','29'),(627,75,'Allen Lim','Power Forward','34'),(628,76,'Jomar Bautista','Point Guard','3'),(629,76,'Rico Valencia','Shooting Guard','6'),(630,76,'Troy Garcia','Small Forward','9'),(631,76,'Matt Lopez','Power Forward','10'),(632,76,'Kenneth Yu','Center','12'),(633,76,'Dave Alcantara','Shooting Guard','14'),(634,76,'Rolly Santiago','Point Guard','15'),(635,76,'Ian Salcedo','Small Forward','17'),(636,76,'Darwin Ong','Power Forward','19'),(637,76,'Nico Reyes','Center','22'),(638,76,'Jordan Fajardo','Shooting Guard','24'),(639,76,'Marvin Co','Small Forward','28'),(640,76,'Noel Tan','Power Forward','32'),(641,76,'Jason Manalo','Center','35'),(642,77,'Jim Mercury','Point Guard','1'),(643,77,'Shadow Fiend','Point Guard','2'),(644,77,'Pudge Butcher','Point Guard','3'),(645,77,'Axe Strong','Shooting Guard','4'),(646,77,'Void Spirit','Shooting Guard','5'),(647,77,'Earth Shaker','Shooting Guard','6'),(648,77,'Arthas Lionheart','Power Forward','7'),(649,77,'Mercury Retrogade','Small Forward','8'),(650,77,'Emotional Intelligence','Small Forward','9'),(651,77,'Wind Runner','Power Forward','10'),(652,77,'Earth Spirit','Power Forward','11'),(653,77,'Ember Spirit','Center','12'),(654,69,'za','Point Guard','12');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
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
