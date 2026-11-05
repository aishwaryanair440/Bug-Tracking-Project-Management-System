-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: bug_tracking_system
-- ------------------------------------------------------
-- Server version	8.0.46

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
-- Table structure for table `faculty`
--

DROP TABLE IF EXISTS `faculty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty` (
  `Faculty_ID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  PRIMARY KEY (`Faculty_ID`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faculty`
--

LOCK TABLES `faculty` WRITE;
/*!40000 ALTER TABLE `faculty` DISABLE KEYS */;
INSERT INTO `faculty` VALUES (1,'Dr. Anil Kumar','anil@college.edu','pass101'),(2,'Dr. Meera Nair','meera@college.edu','pass102'),(3,'Dr. Rajesh Menon','rajesh@college.edu','pass103'),(4,'Dr. Priya Thomas','priya@college.edu','pass104'),(5,'Dr. Arun Joseph','arun@college.edu','pass105'),(6,'Dr. Sneha Varma','sneha@college.edu','pass106'),(7,'Dr. Rahul Das','rahul@college.edu','pass107'),(8,'Dr. Neethu George','neethu@college.edu','pass108'),(9,'Dr. Vivek Mohan','vivek@college.edu','pass109'),(10,'Dr. Lakshmi S','lakshmi@college.edu','pass110');
/*!40000 ALTER TABLE `faculty` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `Project_ID` int NOT NULL AUTO_INCREMENT,
  `Faculty_ID` int NOT NULL,
  `Title` varchar(150) NOT NULL,
  `Description` text,
  `Status` varchar(30) DEFAULT NULL,
  `Start_Date` date DEFAULT NULL,
  `End_Date` date DEFAULT NULL,
  PRIMARY KEY (`Project_ID`),
  KEY `fk_project_faculty` (`Faculty_ID`),
  CONSTRAINT `fk_project_faculty` FOREIGN KEY (`Faculty_ID`) REFERENCES `faculty` (`Faculty_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project`
--

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;
INSERT INTO `project` VALUES (1,1,'Library Management','Online library management system','Completed','2026-01-10','2026-03-20'),(2,2,'Student Portal','College student information portal','In Progress','2026-01-15','2026-04-15'),(3,3,'Attendance System','Digital attendance management','In Progress','2026-02-01','2026-04-30'),(4,4,'Online Examination','Online examination platform','In Progress','2026-02-10','2026-05-10'),(5,5,'Hostel Management','Hostel room allocation system','Planned','2026-02-15','2026-05-20'),(6,6,'Event Management','College event management system','Planned','2026-03-01','2026-06-01'),(7,7,'Bus Tracking','College bus tracking system','In Progress','2026-03-05','2026-06-15'),(8,8,'Placement Portal','Student placement management system','Planned','2026-03-10','2026-07-01'),(9,9,'Complaint System','Online complaint management system','In Progress','2026-03-15','2026-06-30'),(10,10,'Course Registration','Online course registration system','Planned','2026-04-01','2026-07-15');
/*!40000 ALTER TABLE `project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `Team_ID` int NOT NULL AUTO_INCREMENT,
  `Project_ID` int NOT NULL,
  `Team_Name` varchar(100) NOT NULL,
  PRIMARY KEY (`Team_ID`),
  UNIQUE KEY `uq_team_project` (`Project_ID`),
  CONSTRAINT `team_ibfk_1` FOREIGN KEY (`Project_ID`) REFERENCES `project` (`Project_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES (1,1,'Alpha Team'),(2,2,'Beta Team'),(3,3,'Gamma Team'),(4,4,'Delta Team'),(5,5,'Eagle Team'),(6,6,'Phoenix Team'),(7,7,'Titan Team'),(8,8,'Vision Team'),(9,9,'Nova Team'),(10,10,'Code Team');
/*!40000 ALTER TABLE `team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student`
--

DROP TABLE IF EXISTS `student`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student` (
  `Student_ID` int NOT NULL AUTO_INCREMENT,
  `Team_ID` int NOT NULL,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Phone` varchar(15) DEFAULT NULL,
  `Year` int DEFAULT NULL,
  `Password` varchar(255) NOT NULL,
  PRIMARY KEY (`Student_ID`),
  UNIQUE KEY `Email` (`Email`),
  KEY `Team_ID` (`Team_ID`),
  CONSTRAINT `student_ibfk_1` FOREIGN KEY (`Team_ID`) REFERENCES `team` (`Team_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student`
--

LOCK TABLES `student` WRITE;
/*!40000 ALTER TABLE `student` DISABLE KEYS */;
INSERT INTO `student` VALUES (1,1,'Adithya Raj','adithya@gmail.com','9876543210',2,'stud101'),(2,1,'Amal Dev','amal@gmail.com','9876543211',2,'stud102'),(3,2,'Arjun Suresh','arjun@gmail.com','9876543212',3,'stud103'),(4,2,'Akhil Kumar','akhil@gmail.com','9876543213',3,'stud104'),(5,3,'Abhinav P','abhinav@gmail.com','9876543214',2,'stud105'),(6,4,'Anand Krishnan','anand@gmail.com','9876543215',4,'stud106'),(7,5,'Alan Thomas','alan@gmail.com','9876543216',3,'stud107'),(8,6,'Aswin Jose','aswin@gmail.com','9876543217',2,'stud108'),(9,7,'Athul Mohan','athul@gmail.com','9876543218',4,'stud109'),(10,8,'Adarsh Babu','adarsh@gmail.com','9876543219',3,'stud110');
/*!40000 ALTER TABLE `student` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task`
--

DROP TABLE IF EXISTS `task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task` (
  `Task_ID` int NOT NULL AUTO_INCREMENT,
  `Project_ID` int NOT NULL,
  `Student_ID` int NOT NULL,
  `Task_Name` varchar(150) NOT NULL,
  `Description` text,
  `Priority` varchar(20) DEFAULT NULL,
  `Status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`Task_ID`),
  KEY `Project_ID` (`Project_ID`),
  KEY `Student_ID` (`Student_ID`),
  CONSTRAINT `task_ibfk_1` FOREIGN KEY (`Project_ID`) REFERENCES `project` (`Project_ID`),
  CONSTRAINT `task_ibfk_2` FOREIGN KEY (`Student_ID`) REFERENCES `student` (`Student_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task`
--

LOCK TABLES `task` WRITE;
/*!40000 ALTER TABLE `task` DISABLE KEYS */;
INSERT INTO `task` VALUES (1,1,1,'Design database tables','Design database tables','High','Completed'),(2,1,2,'Develop login module','Develop login module','Medium','Completed'),(3,2,3,'Create student dashboard','Create student dashboard','High','In Progress'),(4,2,4,'Develop registration module','Develop registration module','Medium','In Progress'),(5,3,5,'Create attendance database','Create attendance database','High','Completed'),(6,4,6,'Develop examination module','Develop examination module','High','In Progress'),(7,5,7,'Design hostel allocation page','Design hostel allocation page','Low','Pending'),(8,6,8,'Create event registration form','Create event registration form','Medium','In Progress'),(9,7,9,'Implement GPS tracking','Implement GPS tracking','High','Pending'),(10,8,10,'Develop placement dashboard','Develop placement dashboard','Medium','Pending');
/*!40000 ALTER TABLE `task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bug_report`
--

DROP TABLE IF EXISTS `bug_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bug_report` (
  `Bug_ID` int NOT NULL AUTO_INCREMENT,
  `Project_ID` int NOT NULL,
  `Task_ID` int DEFAULT NULL,
  `Faculty_ID` int DEFAULT NULL,
  `Student_ID` int DEFAULT NULL,
  `Reported_By_Role` varchar(20) NOT NULL DEFAULT 'Student',
  `Title` varchar(200) NOT NULL,
  `Priority` varchar(20) DEFAULT NULL,
  `Status` varchar(30) DEFAULT NULL,
  `Report_Date` datetime DEFAULT NULL,
  PRIMARY KEY (`Bug_ID`),
  KEY `Project_ID` (`Project_ID`),
  KEY `Task_ID` (`Task_ID`),
  KEY `Faculty_ID` (`Faculty_ID`),
  KEY `Student_ID` (`Student_ID`),
  CONSTRAINT `bug_report_ibfk_project` FOREIGN KEY (`Project_ID`) REFERENCES `project` (`Project_ID`) ON DELETE CASCADE,
  CONSTRAINT `bug_report_ibfk_1` FOREIGN KEY (`Task_ID`) REFERENCES `task` (`Task_ID`),
  CONSTRAINT `bug_report_ibfk_2` FOREIGN KEY (`Faculty_ID`) REFERENCES `faculty` (`Faculty_ID`),
  CONSTRAINT `bug_report_ibfk_3` FOREIGN KEY (`Student_ID`) REFERENCES `student` (`Student_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bug_report`
--

LOCK TABLES `bug_report` WRITE;
/*!40000 ALTER TABLE `bug_report` DISABLE KEYS */;
INSERT INTO `bug_report` VALUES (1,1,1,1,1,'Student','Login Error','High','Open','2026-04-01 09:00:00'),(2,2,2,2,2,'Student','Slow Dashboard','Medium','In Progress','2026-04-02 10:00:00'),(3,3,3,3,3,'Student','Attendance Error','High','Open','2026-04-03 09:00:00'),(4,4,4,4,4,'Student','Form Validation','Medium','Resolved','2026-04-04 11:00:00'),(5,5,5,5,5,'Student','Missing Records','High','Open','2026-04-05 09:00:00'),(6,6,6,6,6,'Student','Exam Page Error','High','In Progress','2026-04-06 10:00:00'),(7,7,7,7,7,'Student','Allocation Error','Low','Open','2026-04-07 09:00:00'),(8,8,8,8,8,'Student','Registration Error','Medium','Resolved','2026-04-08 11:00:00'),(9,9,9,9,9,'Student','GPS Error','High','Open','2026-04-09 09:00:00'),(10,10,10,10,10,'Student','Placement Error','Medium','In Progress','2026-04-10 10:00:00');
/*!40000 ALTER TABLE `bug_report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `Comment_ID` int NOT NULL AUTO_INCREMENT,
  `Bug_ID` int NOT NULL,
  `Student_ID` int DEFAULT NULL,
  `Comment_Text` text,
  `Comment_Date` datetime DEFAULT NULL,
  PRIMARY KEY (`Comment_ID`),
  KEY `Bug_ID` (`Bug_ID`),
  KEY `Student_ID` (`Student_ID`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`Student_ID`) REFERENCES `student` (`Student_ID`),
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`Bug_ID`) REFERENCES `bug_report` (`Bug_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
INSERT INTO `comments` VALUES (1,1,1,'The login page is not loading correctly.','2026-04-01 00:00:00'),(2,2,2,'The dashboard takes too long to load.','2026-04-02 00:00:00'),(3,3,3,'Attendance data is not being displayed.','2026-04-03 00:00:00'),(4,4,4,'Registration form has a validation issue.','2026-04-04 00:00:00'),(5,5,5,'Some records are missing from the database.','2026-04-05 00:00:00'),(6,6,6,'The examination page shows an error.','2026-04-06 00:00:00'),(7,7,7,'Hostel allocation is not updating.','2026-04-07 00:00:00'),(8,8,8,'Event registration button is not working.','2026-04-08 00:00:00'),(9,9,9,'GPS location is not updating.','2026-04-09 00:00:00'),(10,10,10,'Placement information is not displayed.','2026-04-10 00:00:00');
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
