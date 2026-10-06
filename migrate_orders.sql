-- Run once only if orders/order_items were created by the earlier app version.
USE nexacart;

ALTER TABLE orders MODIFY user_id BIGINT UNSIGNED NULL;
ALTER TABLE orders
  ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending' AFTER payment_method;
ALTER TABLE order_items
  ADD COLUMN seller_id BIGINT UNSIGNED NULL AFTER product_id;
ALTER TABLE order_items
  ADD COLUMN fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'Placed' AFTER quantity;

CREATE INDEX idx_order_items_seller ON order_items (seller_id, fulfillment_status);
