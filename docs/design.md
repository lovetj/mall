# Mall 农产品电商平台 - 项目设计文档

## 一、项目概述

### 1.1 项目背景
Sunny是一个连接城乡的农产品电商平台，主要服务于经常往返于城乡之间的司机群体，将山里的农产品带到城里销售，同时将城里的货物运送到农村。

### 1.2 项目目标
- 搭建一个支持PC端、手机端、小程序、APP的多端电商平台
- 实现农产品展示、销售功能
- 提供物流信息展示
- 支持直播引流

### 1.3 技术选型

| 模块 | 技术栈 | 版本 |
|------|--------|------|
| 后端 | Spring Boot | 2.7.18 |
| 数据库 | MySQL | 8.0 |
| 持久层 | MyBatis | 2.3.2 |
| JDK | Java | 1.8 |
| 前端用户端 | UniApp | 3.0.0-4010520240507001 |
| 前端管理端 | UniApp | 3.0.0-4010520240507001 |
| Node.js | Node | 18.20.0 |

## 二、系统架构

### 2.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   PC端      │  │   手机端    │  │   小程序/APP        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                    UniApp (mall-frontend)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              管理后台 (mall-admin)                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端服务层                              │
│              Spring Boot (mall-backend)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 商品模块  │ │ 用户模块 │ │ 订单模块 │ │ 物流模块 │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│                     MySQL 8.0                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

#### 2.2.1 后端模块 (mall-backend)
- **商品模块**: 农产品分类、商品信息管理
- **用户模块**: 用户注册、登录、信息管理
- **订单模块**: 订单创建、查询、状态管理
- **物流模块**: 城乡物流信息管理
- **系统模块**: 系统配置、轮播图管理

#### 2.2.2 前端用户端 (mall-frontend)
- **首页**: 轮播图、商品推荐、快捷入口
- **商品分类**: 干货、蔬菜、生态油、酒、养殖
- **商品列表**: 各分类商品展示
- **商品详情**: 商品详细信息
- **物流信息**: 城乡物流动态
- **个人中心**: 用户信息、订单管理
- **联系我们**: 微信号、抖音号

#### 2.2.3 管理后台 (mall-admin)
- **登录认证**: 管理员登录
- **商品管理**: 商品增删改查
- **分类管理**: 商品分类管理
- **订单管理**: 订单处理
- **用户管理**: 用户信息管理
- **系统设置**: 轮播图、联系方式配置

## 三、数据库设计

### 3.1 数据库配置
- 数据库名: mall
- 字符集: utf8mb4
- 排序规则: utf8mb4_general_ci

### 3.2 数据表设计

#### 3.2.1 商品分类表 (category)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| name | varchar(50) | 分类名称 |
| code | varchar(50) | 分类编码 |
| icon | varchar(255) | 分类图标 |
| sort | int | 排序 |
| status | tinyint | 状态 0禁用 1启用 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

#### 3.2.2 商品表 (product)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| category_id | bigint | 分类ID |
| name | varchar(100) | 商品名称 |
| image | varchar(255) | 商品图片 |
| images | text | 商品图片集(JSON) |
| price | decimal(10,2) | 价格 |
| unit | varchar(20) | 单位 |
| stock | int | 库存 |
| description | text | 商品描述 |
| origin | varchar(100) | 产地 |
| sales | int | 销量 |
| status | tinyint | 状态 0下架 1上架 |
| sort | int | 排序 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

#### 3.2.3 用户表 (user)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| username | varchar(50) | 用户名 |
| password | varchar(100) | 密码 |
| phone | varchar(20) | 手机号 |
| avatar | varchar(255) | 头像 |
| nickname | varchar(50) | 昵称 |
| status | tinyint | 状态 0禁用 1正常 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

#### 3.2.4 订单表 (order)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| order_no | varchar(50) | 订单号 |
| user_id | bigint | 用户ID |
| total_amount | decimal(10,2) | 总金额 |
| pay_amount | decimal(10,2) | 实付金额 |
| status | tinyint | 状态 |
| receiver_name | varchar(50) | 收货人 |
| receiver_phone | varchar(20) | 收货电话 |
| receiver_address | varchar(255) | 收货地址 |
| remark | varchar(255) | 备注 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

#### 3.2.5 订单明细表 (order_item)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| order_id | bigint | 订单ID |
| product_id | bigint | 商品ID |
| product_name | varchar(100) | 商品名称 |
| product_image | varchar(255) | 商品图片 |
| price | decimal(10,2) | 单价 |
| quantity | int | 数量 |
| amount | decimal(10,2) | 小计 |

#### 3.2.6 轮播图表 (banner)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| title | varchar(100) | 标题 |
| image | varchar(255) | 图片 |
| link | varchar(255) | 跳转链接 |
| sort | int | 排序 |
| status | tinyint | 状态 |
| create_time | datetime | 创建时间 |

#### 3.2.7 物流信息表 (logistics)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| title | varchar(100) | 标题 |
| content | text | 内容 |
| type | tinyint | 类型 1进城 2下乡 |
| image | varchar(255) | 图片 |
| status | tinyint | 状态 |
| create_time | datetime | 创建时间 |

#### 3.2.8 系统配置表 (config)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| config_key | varchar(50) | 配置键 |
| config_value | text | 配置值 |
| description | varchar(255) | 描述 |

#### 3.2.9 管理员表 (admin)
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键ID |
| username | varchar(50) | 用户名 |
| password | varchar(100) | 密码 |
| real_name | varchar(50) | 真实姓名 |
| avatar | varchar(255) | 头像 |
| status | tinyint | 状态 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

## 四、接口设计

### 4.1 接口规范
- 基础路径: /api
- 数据格式: JSON
- 字符编码: UTF-8

### 4.2 接口列表

#### 4.2.1 商品相关接口
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 分类列表 | GET | /api/category/list | 获取商品分类 |
| 商品列表 | GET | /api/product/list | 获取商品列表 |
| 商品详情 | GET | /api/product/{id} | 获取商品详情 |
| 推荐商品 | GET | /api/product/recommend | 获取推荐商品 |

#### 4.2.2 用户相关接口
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 用户注册 | POST | /api/user/register | 用户注册 |
| 用户登录 | POST | /api/user/login | 用户登录 |
| 用户信息 | GET | /api/user/info | 获取用户信息 |
| 修改信息 | PUT | /api/user/info | 修改用户信息 |

#### 4.2.3 订单相关接口
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建订单 | POST | /api/order/create | 创建订单 |
| 订单列表 | GET | /api/order/list | 获取订单列表 |
| 订单详情 | GET | /api/order/{id} | 获取订单详情 |

#### 4.2.4 其他接口
| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 轮播图 | GET | /api/banner/list | 获取轮播图 |
| 物流信息 | GET | /api/logistics/list | 获取物流信息 |
| 系统配置 | GET | /api/config/{key} | 获取系统配置 |

## 五、项目目录结构

```
mall/
├── mall-backend/                 # 后端工程
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mall/
│   │   │   │   ├── controller/   # 控制器
│   │   │   │   ├── service/      # 服务层
│   │   │   │   ├── mapper/       # MyBatis映射
│   │   │   │   ├── entity/       # 实体类
│   │   │   │   ├── dto/          # 数据传输对象
│   │   │   │   ├── config/       # 配置类
│   │   │   │   └── util/         # 工具类
│   │   │   └── resources/
│   │   │       ├── mapper/       # MyBatis XML
│   │   │       └── application.yml
│   │   └── test/
│   ├── pom.xml
│   └── README.md
│
├── mall-frontend/               # 前端用户端
│   ├── pages/                    # 页面
│   │   ├── index/               # 首页
│   │   ├── category/            # 分类页
│   │   ├── product/             # 商品页
│   │   ├── logistics/           # 物流页
│   │   ├── user/                # 用户中心
│   │   └── contact/             # 联系我们
│   ├── components/              # 组件
│   ├── static/                  # 静态资源
│   ├── utils/                   # 工具函数
│   ├── api/                     # 接口封装
│   ├── App.vue
│   ├── main.js
│   ├── manifest.json
│   ├── pages.json
│   └── package.json
│
├── mall-admin/                  # 管理后台
│   ├── pages/                    # 页面
│   │   ├── login/               # 登录页
│   │   ├── index/               # 首页
│   │   ├── product/             # 商品管理
│   │   ├── category/            # 分类管理
│   │   ├── order/               # 订单管理
│   │   ├── user/                # 用户管理
│   │   └── system/              # 系统设置
│   ├── components/
│   ├── static/
│   ├── utils/
│   ├── api/
│   ├── App.vue
│   ├── main.js
│   ├── manifest.json
│   ├── pages.json
│   └── package.json
│
├── docs/                         # 文档目录
│   ├── design.md                # 设计文档
│   ├── development.md           # 开发文档
│   └── deployment.md            # 部署文档
│
└── README.md                     # 项目说明
```

## 六、商品分类规划

### 6.1 一级分类
| 分类名称 | 分类编码 | 说明 |
|----------|----------|------|
| 干货 | ganhuo | 白辣椒、豆角干、茄子干、笋干等 |
| 蔬菜 | shucai | 辣椒、豆角、生姜等时令蔬菜 |
| 生态油 | shengtaiyou | 菜籽油、茶油等天然油 |
| 酒 | jiu | 米酒、红薯酒等农家酿酒 |
| 养殖 | yangzhi | 月子鸡、鸭、羊、牛等 |

### 6.2 二级分类示例
- 干货: 白辣椒、豆角干、茄子干、笋干
- 蔬菜: 辣椒、豆角、生姜、其他
- 生态油: 菜籽油、茶油
- 酒: 米酒、红薯酒
- 养殖: 月子鸡、鸭、羊、牛

## 七、安全设计

### 7.1 接口安全
- 使用JWT进行用户认证
- 敏感接口需要登录验证
- 密码使用BCrypt加密存储

### 7.2 数据安全
- SQL注入防护(MyBatis预编译)
- XSS攻击防护
- CSRF防护

## 八、性能优化

### 8.1 后端优化
- 数据库索引优化
- 分页查询
- 接口缓存

### 8.2 前端优化
- 图片懒加载
- 组件按需加载
- 数据缓存

## 九、扩展规划

### 9.1 短期规划
- 完善商品展示功能
- 实现基础订单流程
- 完善物流信息展示

### 9.2 中期规划
- 在线支付功能
- 直播带货集成
- 物流跟踪功能

### 9.3 长期规划
- 多商户入驻
- 供应链管理
- 数据分析平台
