CREATE DATABASE IF NOT EXISTS progress_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE progress_app;

CREATE TABLE IF NOT EXISTS boards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS board_columns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_board_columns_order (board_id, sort_order),
  CONSTRAINT fk_board_columns_board
    FOREIGN KEY (board_id) REFERENCES boards (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  column_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  details TEXT NULL,
  due_date DATE NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tasks_column (column_id),
  KEY idx_tasks_due_date (due_date),
  CONSTRAINT fk_tasks_column
    FOREIGN KEY (column_id) REFERENCES board_columns (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;
