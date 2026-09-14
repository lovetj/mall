-- ============================================================
-- 支付流水表 payment
-- 记录每次支付请求、第三方单号、回调状态, 是支付体系的核心表
-- ============================================================
CREATE TABLE IF NOT EXISTS `payment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `payment_no` VARCHAR(32) NOT NULL COMMENT '本系统支付流水号(P开头, 唯一)',
  `order_id` BIGINT NOT NULL COMMENT '关联订单ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '关联订单号(冗余, 方便查询)',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `pay_amount` DECIMAL(10,2) NOT NULL COMMENT '支付金额(单位元)',
  `pay_type` TINYINT NOT NULL COMMENT '支付方式 1微信 2支付宝 3货到付款 99Mock',
  `pay_status` TINYINT NOT NULL DEFAULT 0 COMMENT '支付状态 0待支付 1已支付成功 2支付失败 3已关闭 4已退款',
  `transaction_id` VARCHAR(64) DEFAULT NULL COMMENT '微信/支付宝第三方交易号',
  `prepay_id` VARCHAR(64) DEFAULT NULL COMMENT '微信预支付ID(JSAPI/APP场景)',
  `qr_code_url` VARCHAR(512) DEFAULT NULL COMMENT '二维码链接(Native/扫码场景)',
  `mweb_url` VARCHAR(512) DEFAULT NULL COMMENT 'H5支付跳转链接(MWEB场景)',
  `request_param` TEXT DEFAULT NULL COMMENT '下单请求参数(JSON快照, 便于排查)',
  `notify_data` TEXT DEFAULT NULL COMMENT '第三方回调原始报文(JSON)',
  `fail_reason` VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  `client_ip` VARCHAR(64) DEFAULT NULL COMMENT '下单客户端IP',
  `pay_time` DATETIME DEFAULT NULL COMMENT '支付完成时间',
  `expire_time` DATETIME DEFAULT NULL COMMENT '订单过期时间(通常下单后30分钟)',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pay_status` (`pay_status`),
  KEY `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付流水表';

-- 同时确保 order 表字段齐全(迁移已有数据库时执行)
-- ALTER TABLE `order` ADD COLUMN IF NOT EXISTS `pay_type` TINYINT DEFAULT NULL COMMENT '支付方式 1微信 2支付宝 3货到付款';
-- ALTER TABLE `order` ADD COLUMN IF NOT EXISTS `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间';
