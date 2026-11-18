CREATE DATABASE IF NOT EXISTS portfolio;
USE portfolio;
DROP TABLE IF EXISTS skills, skill_groups, projects, education, tags, profile;
CREATE TABLE profile (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120), title VARCHAR(200), location VARCHAR(120), email VARCHAR(120), phone VARCHAR(30), github VARCHAR(200), linkedin VARCHAR(250), summary TEXT);
CREATE TABLE education (id INT PRIMARY KEY AUTO_INCREMENT, school VARCHAR(200), degree VARCHAR(120), period VARCHAR(30));
CREATE TABLE skill_groups (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120));
CREATE TABLE skills (id INT PRIMARY KEY AUTO_INCREMENT, group_id INT, name VARCHAR(80), FOREIGN KEY (group_id) REFERENCES skill_groups(id) ON DELETE CASCADE);
CREATE TABLE projects (id INT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(200), tech JSON, description TEXT, points JSON);
CREATE TABLE tags (id INT PRIMARY KEY AUTO_INCREMENT, kind ENUM('strength','language'), name VARCHAR(80));
