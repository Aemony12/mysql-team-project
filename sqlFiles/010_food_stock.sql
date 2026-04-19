USE museumdb;

ALTER TABLE Food
  ADD COLUMN Stock_Quantity INT NOT NULL DEFAULT 0,
  ADD CONSTRAINT chk_food_stock CHECK (Stock_Quantity >= 0);
