-- ----------------------------------------------------
-- 微信登录支持: user表字段扩展及调整
-- ----------------------------------------------------
USE `mall`;

-- 1. 增加 openid 和 unionid 字段，并建立唯一索引
ALTER TABLE `user` 
  ADD COLUMN `openid` VARCHAR(64) DEFAULT NULL COMMENT '微信小程序openid' AFTER `phone`,
  ADD COLUMN `unionid` VARCHAR(64) DEFAULT NULL COMMENT '微信开放平台unionid' AFTER `openid`,
  ADD UNIQUE KEY `uk_openid` (`openid`),
  ADD KEY `idx_unionid` (`unionid`);

-- 2. 调整 password 字段允许为 NULL (微信登录免密)
ALTER TABLE `user` 
  MODIFY COLUMN `password` VARCHAR(100) DEFAULT NULL COMMENT '密码(微信免密用户可为空)';
