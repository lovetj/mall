-- 订单表结构升级脚本（适用于已有数据库）
-- 执行前请备份数据库！

USE mall;

-- 1. order 表：新增字段
ALTER TABLE `order`
    ADD COLUMN `address_id` BIGINT DEFAULT NULL COMMENT '收货地址ID(关联address表)' AFTER `user_id`,
    ADD COLUMN `product_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '商品小计' AFTER `address_id`,
    ADD COLUMN `freight_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '快递费' AFTER `product_total`,
    ADD COLUMN `pay_type` TINYINT DEFAULT NULL COMMENT '支付方式 1微信 2支付宝 3货到付款' AFTER `pay_amount`,
    ADD COLUMN `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间' AFTER `remark`,
    ADD COLUMN `ship_time` DATETIME DEFAULT NULL COMMENT '发货时间' AFTER `pay_time`,
    ADD COLUMN `receive_time` DATETIME DEFAULT NULL COMMENT '确认收货时间' AFTER `ship_time`,
    ADD INDEX `idx_status` (`status`);

-- 2. 将原 total_amount 数据迁移到 product_total
UPDATE `order` SET `product_total` = `total_amount` WHERE `product_total` = 0;

-- 3. 删除旧的 total_amount 列（可选，如果确认不再需要）
-- ALTER TABLE `order` DROP COLUMN `total_amount`;
-- 注：建议先保留 total_amount 一段时间，确认全部迁移完成后再删除

-- 4. receiver_address 扩大到 500 字符以容纳完整地址
ALTER TABLE `order` MODIFY COLUMN `receiver_address` VARCHAR(500) NOT NULL COMMENT '完整收货地址(下单时快照,含省市区+详细地址+门牌号)';

-- 5. order_item 表：新增 product_unit 字段
ALTER TABLE `order_item`
    ADD COLUMN `product_unit` VARCHAR(20) DEFAULT NULL COMMENT '商品单位(下单时快照,如斤/只)' AFTER `product_image`;
