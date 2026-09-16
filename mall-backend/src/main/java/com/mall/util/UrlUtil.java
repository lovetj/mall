package com.mall.util;

import com.mall.config.FileConfigProperties;
import com.mall.dto.CartVO;
import com.mall.entity.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 统一的 URL 拼接工具，将数据库中存储的相对路径转换为完整可访问的 URL
 */
@Component
public class UrlUtil {

    @Autowired
    private FileConfigProperties fileConfigProperties;

    /**
     * 原样返回路径，不再由后端拼接 baseServer。
     * 数据库存储相对路径（如 /product/xxx.jpg），由前端通过 formatImageUrl 自行拼接。
     */
    public String resolve(String path) {
        if (!StringUtils.hasText(path)) {
            return path;
        }
        return path.trim();
    }

    /**
     * 处理 Product 的 image / images 字段
     * images 可能是逗号分隔的多个相对路径
     */
    public void resolveProduct(Product product) {
        if (product == null) return;
        product.setImage(resolve(product.getImage()));
        if (StringUtils.hasText(product.getImages())) {
            product.setImages(resolveImages(product.getImages()));
        }
        if (product.getTierList() != null) {
            resolveProductTiers(product.getTierList());
        }
    }

    /**
     * 处理 Banner 的 image 字段
     */
    public void resolveBanner(Banner banner) {
        if (banner == null) return;
        banner.setImage(resolve(banner.getImage()));
    }

    /**
     * 处理 Category 的 icon 字段
     */
    public void resolveCategory(Category category) {
        if (category == null) return;
        category.setIcon(resolve(category.getIcon()));
    }

    /**
     * 处理 User 的 avatar 字段
     */
    public void resolveUser(User user) {
        if (user == null) return;
        user.setAvatar(resolve(user.getAvatar()));
    }

    /**
     * 处理 OrderItem 的 productImage 字段
     */
    public void resolveOrderItem(OrderItem orderItem) {
        if (orderItem == null) return;
        orderItem.setProductImage(resolve(orderItem.getProductImage()));
    }

    /**
     * 处理 ProductTag 的 image 字段
     */
    public void resolveProductTag(ProductTag tag) {
        if (tag == null) return;
        tag.setImage(resolve(tag.getImage()));
    }

    /**
     * 处理 CartVO 的 image 字段
     */
    public void resolveCartVO(CartVO vo) {
        if (vo == null) return;
        vo.setImage(resolve(vo.getImage()));
    }

    public void resolveProductTier(ProductTier tier) {
        if (tier == null) return;
        tier.setImage(resolve(tier.getImage()));
    }

    public void resolveProductTiers(List<ProductTier> list) {
        if (list != null) list.forEach(this::resolveProductTier);
    }

    /**
     * 批量处理 Product 列表
     */
    public void resolveProducts(List<Product> list) {
        if (list != null) list.forEach(this::resolveProduct);
    }

    /**
     * 批量处理 Banner 列表
     */
    public void resolveBanners(List<Banner> list) {
        if (list != null) list.forEach(this::resolveBanner);
    }

    /**
     * 批量处理 Category 列表
     */
    public void resolveCategories(List<Category> list) {
        if (list != null) list.forEach(this::resolveCategory);
    }

    /**
     * 批量处理 User 列表
     */
    public void resolveUsers(List<User> list) {
        if (list != null) list.forEach(this::resolveUser);
    }

    /**
     * 批量处理 OrderItem 列表
     */
    public void resolveOrderItems(List<OrderItem> list) {
        if (list != null) list.forEach(this::resolveOrderItem);
    }

    /**
     * 批量处理 ProductTag 列表
     */
    public void resolveProductTags(List<ProductTag> list) {
        if (list != null) list.forEach(this::resolveProductTag);
    }

    /**
     * 批量处理 CartVO 列表
     */
    public void resolveCartVOs(List<CartVO> list) {
        if (list != null) list.forEach(this::resolveCartVO);
    }

    /**
     * 处理 images 字段
     * 支持两种格式：
     * 1. JSON 数组字符串：["/product/a.jpg","/product/b.jpg"]
     * 2. 逗号分隔：/product/a.jpg,/product/b.jpg
     */
    private String resolveImages(String images) {
        String trimmed = images.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            // JSON 数组格式
            try {
                String inner = trimmed.substring(1, trimmed.length() - 1);
                if (!inner.trim().isEmpty()) {
                    String[] parts = inner.split(",");
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < parts.length; i++) {
                        if (i > 0) sb.append(",");
                        String item = parts[i].trim().replace("\"", "").replace("'", "");
                        sb.append(resolve(item));
                    }
                    return sb.toString();
                }
                return "";
            } catch (Exception e) {
                // fallback to comma split
            }
        }
        // 逗号分隔格式
        String[] parts = trimmed.split(",");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(resolve(parts[i].trim()));
        }
        return sb.toString();
    }
}
