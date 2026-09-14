-- 初始化数据库
SET NAMES utf8mb4;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS mall DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE mall;

-- 商品分类表
CREATE TABLE IF NOT EXISTS `category` (
                                          `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                          `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
    `code` VARCHAR(50) NOT NULL COMMENT '分类编码',
    `icon` VARCHAR(255) DEFAULT NULL COMMENT '分类图标',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 商品标签表
CREATE TABLE IF NOT EXISTS `product_tag` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `name` VARCHAR(50) NOT NULL COMMENT '标签名称',
    `image` VARCHAR(255) DEFAULT NULL COMMENT '标签图片',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `is_hotselling` TINYINT DEFAULT 0 COMMENT '是否热销 0否 1是',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品标签表';

-- 商品表
CREATE TABLE IF NOT EXISTS `product` (
                                         `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                         `category_id` BIGINT NOT NULL COMMENT '分类ID',
                                         `name` VARCHAR(100) NOT NULL COMMENT '商品名称',
    `image` VARCHAR(255) DEFAULT NULL COMMENT '商品图片',
    `images` TEXT DEFAULT NULL COMMENT '商品图片集(JSON)',
    `tags` TEXT DEFAULT NULL COMMENT '商品标签(JSON或逗号分隔)',
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '价格',
    `unit` VARCHAR(20) DEFAULT '斤' COMMENT '单位',
    `stock` INT DEFAULT 999 COMMENT '库存',
    `description` TEXT DEFAULT NULL COMMENT '商品描述',
    `origin` VARCHAR(100) DEFAULT NULL COMMENT '产地',
    `sales` INT DEFAULT 0 COMMENT '销量',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0下架 1上架',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_category_id` (`category_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
                                      `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                      `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(100) NOT NULL COMMENT '密码',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
    `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1正常',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 购物车表
CREATE TABLE IF NOT EXISTS `cart` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    `quantity` INT NOT NULL DEFAULT 1 COMMENT '数量',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';

-- 订单表
CREATE TABLE IF NOT EXISTS `order` (
                                       `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                       `order_no` VARCHAR(50) NOT NULL COMMENT '订单号',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `address_id` BIGINT DEFAULT NULL COMMENT '收货地址ID(关联address表)',
    `product_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '商品小计',
    `freight_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '快递费',
    `pay_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '实付金额(=商品小计+快递费)',
    `pay_type` TINYINT DEFAULT NULL COMMENT '支付方式 1微信 2支付宝 3货到付款',
    `status` TINYINT DEFAULT 0 COMMENT '状态 0待付款 1待发货 2待收货 3已完成 4已取消',
    `receiver_name` VARCHAR(50) NOT NULL COMMENT '收货人(下单时快照)',
    `receiver_phone` VARCHAR(20) NOT NULL COMMENT '收货电话(下单时快照)',
    `receiver_address` VARCHAR(500) NOT NULL COMMENT '完整收货地址(下单时快照,含省市区+详细地址+门牌号)',
    `remark` VARCHAR(255) DEFAULT NULL COMMENT '买家备注',
    `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
    `ship_time` DATETIME DEFAULT NULL COMMENT '发货时间',
    `receive_time` DATETIME DEFAULT NULL COMMENT '确认收货时间',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单明细表
CREATE TABLE IF NOT EXISTS `order_item` (
                                            `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                            `order_id` BIGINT NOT NULL COMMENT '订单ID',
                                            `product_id` BIGINT NOT NULL COMMENT '商品ID',
                                            `product_name` VARCHAR(100) NOT NULL COMMENT '商品名称(下单时快照)',
    `product_image` VARCHAR(255) DEFAULT NULL COMMENT '商品图片(下单时快照)',
    `product_unit` VARCHAR(20) DEFAULT NULL COMMENT '商品单位(下单时快照,如斤/只)',
    `price` DECIMAL(10,2) NOT NULL COMMENT '单价(下单时快照)',
    `quantity` INT NOT NULL COMMENT '数量',
    `amount` DECIMAL(10,2) NOT NULL COMMENT '小计(=price*quantity)',
    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- 轮播图表
CREATE TABLE IF NOT EXISTS `banner` (
                                        `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                        `title` VARCHAR(100) DEFAULT NULL COMMENT '标题',
    `image` VARCHAR(255) NOT NULL COMMENT '图片',
    `link` VARCHAR(255) DEFAULT NULL COMMENT '跳转链接',
    `sort` INT DEFAULT 0 COMMENT '排序',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播图表';

-- 物流信息表
CREATE TABLE IF NOT EXISTS `logistics` (
                                           `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                           `title` VARCHAR(100) NOT NULL COMMENT '标题',
    `content` TEXT DEFAULT NULL COMMENT '内容',
    `type` TINYINT DEFAULT 1 COMMENT '类型 1进城 2下乡',
    `image` VARCHAR(255) DEFAULT NULL COMMENT '图片',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流信息表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS `config` (
                                        `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                        `config_key` VARCHAR(50) NOT NULL COMMENT '配置键',
    `config_value` TEXT DEFAULT NULL COMMENT '配置值',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '描述',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 管理员表
CREATE TABLE IF NOT EXISTS `admin` (
                                       `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                                       `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(100) NOT NULL COMMENT '密码',
    `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
    `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
    `status` TINYINT DEFAULT 1 COMMENT '状态 0禁用 1正常',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 初始化分类数据
INSERT INTO `category` (`name`, `code`, `icon`, `sort`, `status`) VALUES
('干货', 'ganhuo', '/static/icons/ganhuo.png', 1, 1),
('蔬菜', 'shucai', '/static/icons/shucai.png', 2, 1),
('生态油', 'shengtaiyou', '/static/icons/oil.png', 3, 1),
('酒', 'jiu', '/static/icons/jiu.png', 4, 1),
('养殖', 'yangzhi', '/static/icons/yangzhi.png', 5, 1);

-- 初始化商品标签数据
INSERT INTO `product_tag` (`name`, `image`, `sort`, `is_hotselling`, `status`) VALUES
('热销推荐', '/static/icons/ganhuo.png', 1, 1, 1),
('新鲜采摘', '/static/icons/shucai.png', 2, 0, 1),
('农家自产', '/static/icons/oil.png', 3, 0, 1);

-- 初始化商品数据
INSERT INTO `product` (`category_id`, `name`, `price`, `unit`, `description`, `origin`, `status`, `sort`) VALUES
(1, '白辣椒', 25.00, '斤', '农家晒制白辣椒，香辣可口，是下饭的好伴侣', '大山村', 1, 1),
(1, '豆角干', 20.00, '斤', '精选新鲜豆角晒制，保留原汁原味', '大山村', 1, 2),
(1, '茄子干', 22.00, '斤', '传统工艺晒制，软糯香甜', '大山村', 1, 3),
(1, '笋干', 35.00, '斤', '高山竹笋晒制，鲜嫩爽口', '大山村', 1, 4),
(2, '辣椒', 8.00, '斤', '新鲜采摘，辣味十足', '大山村', 1, 1),
(2, '豆角', 6.00, '斤', '农家种植，新鲜嫩绿', '大山村', 1, 2),
(2, '生姜', 10.00, '斤', '老姜味道浓郁，适合烹饪', '大山村', 1, 3),
(3, '菜籽油', 15.00, '斤', '传统压榨，纯正香浓', '大山村', 1, 1),
(3, '茶油', 60.00, '斤', '高山茶籽压榨，营养丰富', '大山村', 1, 2),
(4, '米酒', 20.00, '斤', '农家自酿米酒，醇香甘甜', '大山村', 1, 1),
(4, '红薯酒', 25.00, '斤', '传统工艺酿造，口感独特', '大山村', 1, 2),
(5, '月子鸡', 150.00, '只', '散养土鸡，滋补佳品', '大山村', 1, 1),
(5, '土鸭', 120.00, '只', '农家散养，肉质鲜美', '大山村', 1, 2),
(5, '山羊肉', 45.00, '斤', '高山放养，肉质细嫩', '大山村', 1, 3),
(5, '黄牛肉', 55.00, '斤', '农家养殖，新鲜宰杀', '大山村', 1, 4);

-- 初始化轮播图数据
INSERT INTO `banner` (`title`, `image`, `link`, `sort`, `status`) VALUES
('新鲜农产品', '/static/banners/banner1.jpg', '/pages/product/list', 1, 1),
('大山里的味道', '/static/banners/banner2.jpg', '/pages/product/list', 2, 1),
('城乡物流', '/static/banners/banner3.jpg', '/pages/logistics/list', 3, 1);

-- 初始化系统配置
INSERT INTO `config` (`config_key`, `config_value`, `description`) VALUES
('wechat', 'mall-farm', '微信号'),
('douyin', 'mall-farm', '抖音号'),
('phone', '13800138000', '联系电话'),
('address', '某省某市某县大山村', '地址'),
('amap_key', '', '高德地图Web服务Key'),
('amap_secret', '', '高德地图数字密钥(安全密钥/Secret Key)');

-- 初始化管理员账号 (密码: admin123)
INSERT INTO `admin` (`username`, `password`, `real_name`, `status`) VALUES
('admin', '$2a$10$f3o1ECZ6a.VZhezkmhl46uBpGmnPNmLvsRDIdjkJ/a/oNodOZJu0S', '管理员', 1);

-- 初始化测试用户 (密码: 123456)
INSERT INTO `user` (`username`, `password`, `nickname`, `phone`, `status`) VALUES
('user', '$2a$10$rjet.LriLzGqBZ9StUj0QeBKAnojolx.fgAqVWlhC7KgvRiQSb4z.', '测试用户', '13800138001', 1);

-- 用户收货地址表
CREATE TABLE IF NOT EXISTS `address` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `receiver_name` VARCHAR(20) NOT NULL COMMENT '收货人(不超过20个字)',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号码',
    `detail_address` VARCHAR(255) NOT NULL COMMENT '详细地址(小区/学校/大厦等)',
    `house_number` VARCHAR(100) DEFAULT '' COMMENT '楼号门牌(例如3号楼102室)',
    `address_type` VARCHAR(20) DEFAULT '家' COMMENT '地址类型(公司,家,学校)',
    `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
    `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
    `district` VARCHAR(50) DEFAULT NULL COMMENT '区/县',
    `latitude` DECIMAL(10, 6) DEFAULT NULL COMMENT '纬度',
    `longitude` DECIMAL(10, 6) DEFAULT NULL COMMENT '经度',
    `is_default` TINYINT DEFAULT 0 COMMENT '是否默认 0否 1是',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收货地址表';

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