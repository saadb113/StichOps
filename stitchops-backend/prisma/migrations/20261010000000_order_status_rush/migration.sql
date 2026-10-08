-- 'In progress' status was replaced by 'Rush'
UPDATE "Order" SET "status" = 'Rush' WHERE "status" = 'In progress';
