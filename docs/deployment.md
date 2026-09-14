# Mall 农产品电商平台 - 部署文档

## 一、服务器环境要求

### 1.1 硬件要求
- CPU: 2核及以上
- 内存: 4GB及以上
- 硬盘: 50GB及以上

### 1.2 软件要求
| 软件 | 版本 | 说明 |
|------|------|------|
| CentOS/Ubuntu | 7.x/20.04 | 操作系统 |
| JDK | 1.8 | Java运行环境 |
| MySQL | 8.0 | 数据库 |
| Nginx | 1.20+ | Web服务器 |
| Node.js | 18.x | 前端构建 |

## 二、后端部署

### 2.1 安装JDK
```bash
# CentOS
yum install java-1.8.0-openjdk java-1.8.0-openjdk-devel -y

# Ubuntu
apt update
apt install openjdk-8-jdk -y

# 验证安装
java -version
```

### 2.2 安装MySQL
```bash
# CentOS
yum install mysql-server -y
systemctl start mysqld
systemctl enable mysqld

# Ubuntu
apt install mysql-server -y
systemctl start mysql
systemctl enable mysql

# 安全配置
mysql_secure_installation
```

### 2.3 创建数据库
```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE mall DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

# 创建用户(可选)
CREATE USER 'mall'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON mall.* TO 'mall'@'%';
FLUSH PRIVILEGES;
```

### 2.4 导入初始数据
```bash
mysql -u root -p mall < mall-backend/sql/init.sql
```

### 2.5 打包后端项目
```bash
cd mall-backend
mvn clean package -DskipTests
```

### 2.6 上传并启动
```bash
# 创建应用目录
mkdir -p /opt/mall

# 上传jar包
scp target/mall-backend-1.0.0.jar root@your-server:/opt/mall/

# 创建配置文件(可选，用于覆盖默认配置)
vim /opt/mall/application.yml
```

### 2.7 创建系统服务
```bash
vim /etc/systemd/system/mall-backend.service
```

内容如下：
```ini
[Unit]
Description=Mall Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/mall
ExecStart=/usr/bin/java -jar -Xms512m -Xmx1024m /opt/mall/mall-backend-1.0.0.jar --spring.config.location=/opt/mall/application.yml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
systemctl daemon-reload
systemctl start mall-backend
systemctl enable mall-backend
systemctl status mall-backend
```

## 三、前端部署

### 3.1 安装Node.js
```bash
# 使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18.20.0
nvm use 18.20.0

# 或直接安装
# CentOS
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install nodejs -y

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs -y
```

### 3.2 构建前端项目

#### 用户端构建
```bash
cd mall-frontend

# 安装依赖
npm install

# 修改API地址
vim utils/request.js
# 将 BASE_URL 改为实际服务器地址
# const BASE_URL = 'https://your-domain.com/api'

# 构建H5版本
npm run build:h5

# 构建产物在 dist/build/h5 目录
```

#### 管理后台构建
```bash
cd mall-admin

# 安装依赖
npm install

# 修改API地址
vim utils/request.js

# 构建
npm run build:h5
```

### 3.3 上传构建产物
```bash
# 创建web目录
mkdir -p /var/www/mall-frontend
mkdir -p /var/www/mall-admin

# 上传构建产物
scp -r mall-frontend/dist/build/h5/* root@your-server:/var/www/mall-frontend/
scp -r mall-admin/dist/build/h5/* root@your-server:/var/www/mall-admin/
```

## 四、Nginx配置

### 4.1 安装Nginx
```bash
# CentOS
yum install nginx -y

# Ubuntu
apt install nginx -y

systemctl start nginx
systemctl enable nginx
```

### 4.2 配置Nginx
```bash
vim /etc/nginx/conf.d/mall.conf
```

内容如下：
```nginx
# 后端API
upstream backend {
    server 127.0.0.1:8080;
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/your-domain.com.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.com.key;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;

    # 用户端
    location / {
        root /var/www/mall-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 管理后台
    location /admin {
        alias /var/www/mall-admin;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 文件上传大小限制
        client_max_body_size 50m;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain application/javascript application/x-javascript text/css application/xml text/javascript application/json;
    gzip_vary on;
}
```

### 4.3 测试并重启Nginx
```bash
nginx -t
systemctl restart nginx
```

## 五、SSL证书配置

### 5.1 使用Let's Encrypt免费证书
```bash
# 安装certbot
# CentOS
yum install certbot python3-certbot-nginx -y

# Ubuntu
apt install certbot python3-certbot-nginx -y

# 申请证书
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
certbot renew --dry-run
```

### 5.2 使用阿里云/腾讯云证书
1. 在云服务商控制台申请SSL证书
2. 下载Nginx格式证书
3. 上传到服务器 `/etc/nginx/ssl/` 目录
4. 修改Nginx配置中的证书路径

## 六、小程序部署

### 6.1 微信小程序配置
1. 登录微信公众平台
2. 配置服务器域名
   - request合法域名: `https://your-domain.com`
   - uploadFile合法域名: `https://your-domain.com`
   - downloadFile合法域名: `https://your-domain.com`

### 6.2 构建小程序
```bash
cd mall-frontend

# 构建微信小程序
npm run build:mp-weixin

# 构建产物在 dist/build/mp-weixin 目录
```

### 6.3 上传小程序
1. 打开微信开发者工具
2. 导入项目，选择 `dist/build/mp-weixin` 目录
3. 填写AppID
4. 点击上传
5. 在微信公众平台提交审核

## 七、APP打包

### 7.1 使用HBuilderX云打包
1. 打开HBuilderX
2. 导入项目
3. 点击 发行 -> 原生App-云打包
4. 选择平台(Android/iOS)
5. 填写证书信息
6. 点击打包

### 7.2 离线打包
参考DCloud官方文档进行离线打包配置。

## 八、运维监控

### 8.1 日志管理
```bash
# 后端日志
tail -f /opt/mall/logs/spring.log

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 8.2 服务管理
```bash
# 后端服务
systemctl start mall-backend
systemctl stop mall-backend
systemctl restart mall-backend
systemctl status mall-backend

# Nginx
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl status nginx

# MySQL
systemctl start mysqld
systemctl stop mysqld
systemctl restart mysqld
```

### 8.3 数据库备份
```bash
# 创建备份脚本
vim /opt/scripts/backup.sh
```

内容如下：
```bash
#!/bin/bash
BACKUP_DIR=/opt/backup/mysql
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u root -p'your_password' mall > $BACKUP_DIR/sunny_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

添加定时任务：
```bash
chmod +x /opt/scripts/backup.sh
crontab -e

# 每天凌晨2点备份
0 2 * * * /opt/scripts/backup.sh
```

## 九、安全配置

### 9.1 防火墙配置
```bash
# CentOS
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload

# Ubuntu
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 9.2 MySQL安全
```bash
# 禁止root远程登录
mysql -u root -p
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
FLUSH PRIVILEGES;

# 修改root密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_strong_password';
```

### 9.3 定期更新
```bash
# 更新系统
yum update -y  # CentOS
apt update && apt upgrade -y  # Ubuntu
```

## 十、常见问题

### 10.1 后端启动失败
- 检查JDK版本
- 检查数据库连接
- 查看日志文件

### 10.2 前端访问空白
- 检查Nginx配置
- 检查文件权限
- 查看浏览器控制台错误

### 10.3 接口跨域问题
- 后端已配置CORS
- Nginx代理配置正确

### 10.4 小程序请求失败
- 检查服务器域名配置
- 确保使用HTTPS
- 检查证书是否有效

## 十一、性能优化

### 11.1 后端优化
- 增加JVM内存
- 启用Redis缓存
- 数据库索引优化

### 11.2 前端优化
- 开启Gzip压缩
- 静态资源CDN
- 图片懒加载

### 11.3 数据库优化
- 定期优化表
- 慢查询分析
- 读写分离(高并发场景)
