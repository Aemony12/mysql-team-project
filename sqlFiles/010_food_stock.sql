-- HOW TO RUN: In MySQL Workbench use File > Run SQL Script
USE museumdb;

ALTER TABLE Food
  ADD COLUMN Stock_Quantity INT NOT NULL DEFAULT 0;
