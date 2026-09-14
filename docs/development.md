# Mall 农产品电商平台 - 开发文档

## 一、开发环境准备

### 1.1 后端环境

| 软件 | 版本 | 说明 |
|------|------|------|
| JDK | 1.8 | Java开发环境 |
| Maven | 3.6+ | 项目构建工具 |
| MySQL | 8.0 | 数据库 |
| Redis | 6.0+ | 缓存服务(可选) |
| IDEA | 2020+ | 开发工具 |

### 1.2 前端环境

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18.20.0 | JavaScript运行环境 |
| npm | 9.x | 包管理器 |
| HBuilderX | 最新版 | UniApp开发工具 |

## 二、项目启动

### 2.1 后端项目启动

#### 步骤一：数据库初始化
```bash
# 1. 创建数据库并导入初始数据
mysql -u root -p123456 < mall-backend/sql/init.sql

# 或者手动执行
# 登录MySQL
mysql -u root -p
# 执行SQL文件
source d:/trae/mall/mall-backend/sql/init.sql
```

#### 步骤二：修改配置文件
编辑 `mall-backend/src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mall?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root
    password: 123456  # 修改为你的数据库密码
```

#### 步骤三：启动项目
```bash
# 方式一：使用Maven命令
cd mall-backend
mvn spring-boot:run

# 方式二：使用IDEA
# 打开SunnyApplication.java，点击运行按钮

# 方式三：打包后运行
mvn clean package -DskipTests
java -jar target/mall-backend-1.0.0.jar
```

启动成功后，访问 http://localhost:8080 即可。

### 2.2 前端用户端启动

#### 方式一：使用HBuilderX
1. 打开HBuilderX
2. 导入项目 `mall-frontend`
3. 点击 运行 -> 运行到浏览器/小程序/模拟器

#### 方式二：使用命令行
```bash
cd mall-frontend

# 安装依赖
npm install

# 运行H5版本
npm run dev:h5

# 运行微信小程序
npm run dev:mp-weixin

# 打包H5版本
npm run build:h5
```

### 2.3 管理后台启动

```bash
cd mall-admin

# 安装依赖
npm install

# 运行H5版本
npm run dev:h5

# 打包
npm run build:h5
```

## 三、项目结构说明

### 3.1 后端项目结构
```
mall-backend/
├── src/main/java/com/mall/
│   ├── SunnyApplication.java    # 启动类
│   ├── controller/              # 控制器层
│   │   ├── CategoryController.java
│   │   ├── ProductController.java
│   │   ├── OrderController.java
│   │   ├── BannerController.java
│   │   ├── LogisticsController.java
│   │   ├── ConfigController.java
│   │   └── AdminController.java
│   ├── service/                 # 服务层接口
│   ├── service/impl/            # 服务层实现
│   ├── mapper/                  # MyBatis Mapper
│   ├── entity/                  # 实体类
│   ├── dto/                     # 数据传输对象
│   ├── common/                  # 通用类
│   ├── config/                  # 配置类
│   ├── util/                    # 工具类
│   └── exception/               # 异常处理
├── src/main/resources/
│   ├── mapper/                  # MyBatis XML
│   └── application.yml          # 配置文件
├── sql/
│   └── init.sql                 # 数据库初始化脚本
└── pom.xml                      # Maven配置
```

### 3.2 前端用户端结构
```
mall-frontend/
├── pages/                       # 页面
│   ├── index/                   # 首页
│   ├── category/                # 分类页
│   ├── product/                 # 商品页
│   │   ├── list.vue
│   │   └── detail.vue
│   ├── logistics/               # 物流页
│   ├── cart/                    # 购物车
│   ├── user/                    # 用户中心
│   │   ├── user.vue
│   │   └── order.vue
│   └── contact/                 # 联系我们
├── api/                         # 接口封装
├── utils/                       # 工具函数
├── static/                      # 静态资源
├── App.vue                      # 应用入口
├── main.js                      # 主入口
├── pages.json                   # 页面配置
├── manifest.json                # 应用配置
├── package.json                 # 依赖配置
└── vite.config.js               # Vite配置
```

### 3.3 管理后台结构
```
mall-admin/
├── pages/                       # 页面
│   ├── login/                   # 登录页
│   ├── index/                   # 首页
│   ├── product/                 # 商品管理
│   │   ├── list.vue
│   │   └── edit.vue
│   ├── category/                # 分类管理
│   ├── order/                   # 订单管理
│   └── config/                  # 系统配置
├── api/                         # 接口封装
├── utils/                       # 工具函数
├── App.vue
├── main.js
├── pages.json
├── manifest.json
├── package.json
└── vite.config.js
```

## 四、接口文档

### 4.1 公共响应格式
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

### 4.2 分类接口

#### 获取分类列表
- **URL**: `/api/category/list`
- **Method**: `GET`
- **响应**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "干货",
      "code": "ganhuo",
      "icon": "/static/icons/ganhuo.png",
      "sort": 1,
      "status": 1
    }
  ]
}
```

### 4.3 商品接口

#### 获取商品列表
- **URL**: `/api/product/list`
- **Method**: `GET`
- **响应**: 商品数组

#### 获取分类商品
- **URL**: `/api/product/category/{categoryId}`
- **Method**: `GET`
- **参数**: categoryId - 分类ID
- **响应**: 商品数组

#### 获取商品详情
- **URL**: `/api/product/{id}`
- **Method**: `GET`
- **参数**: id - 商品ID
- **响应**: 商品对象

#### 分页查询商品
- **URL**: `/api/product/page`
- **Method**: `GET`
- **参数**: 
  - pageNum: 页码
  - pageSize: 每页数量
  - keyword: 搜索关键词
  - categoryId: 分类ID
  - status: 状态

### 4.4 订单接口

#### 创建订单
- **URL**: `/api/order/create`
- **Method**: `POST`
- **参数**:
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "receiverName": "张三",
  "receiverPhone": "13800138000",
  "receiverAddress": "某省某市某区某街道",
  "remark": "备注"
}
```

#### 获取订单列表
- **URL**: `/api/order/list`
- **Method**: `GET`
- **参数**: pageNum, pageSize

### 4.5 其他接口

#### 轮播图
- **URL**: `/api/banner/list`
- **Method**: `GET`

#### 物流信息
- **URL**: `/api/logistics/list`
- **Method**: `GET`

#### 系统配置
- **URL**: `/api/config/{key}`
- **Method**: `GET`

#### 管理员登录
- **URL**: `/api/admin/login`
- **Method**: `POST`
- **参数**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

## 五、开发规范

### 5.1 代码规范

#### Java代码规范
- 类名使用大驼峰命名：`ProductService`
- 方法名使用小驼峰命名：`getProductList`
- 常量使用全大写下划线：`MAX_SIZE`
- 包名使用小写：`com.mall.service`

#### Vue代码规范
- 组件名使用大驼峰：`ProductList`
- 方法名使用小驼峰：`loadProducts`
- 变量名使用小驼峰：`productList`
- 常量使用全大写：`BASE_URL`

### 5.2 Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 5.3 注释规范
- 类注释：说明类的用途
- 方法注释：说明方法功能、参数、返回值
- 关键代码注释：解释复杂逻辑

## 六、常见问题

### 6.1 后端启动失败
1. 检查数据库是否启动
2. 检查数据库连接配置是否正确
3. 检查JDK版本是否为1.8

### 6.2 前端无法访问后端接口
1. 检查后端是否启动
2. 检查跨域配置
3. 检查接口地址是否正确

### 6.3 小程序无法请求接口
1. 在微信开发者工具中勾选"不校验合法域名"
2. 配置服务器域名白名单

### 6.4 管理后台登录失败
1. 检查数据库中admin表是否有数据
2. 默认账号：admin / admin123
3. 密码使用BCrypt加密

## 七、扩展开发

### 7.1 添加新的商品分类
1. 在数据库category表插入新分类
2. 后端无需修改，自动支持

### 7.2 添加新的接口
1. 在controller包创建新的Controller
2. 在service包创建对应的Service
3. 在mapper包创建对应的Mapper
4. 前端api/index.js中添加接口调用

### 7.3 添加新的页面
1. 在pages目录创建页面文件
2. 在pages.json中配置页面路由
3. 开发页面内容
